"""
Per-user concurrent request limiter backed by Redis atomic counters.

Uses INCR/DECR to track in-flight requests per user.  A safety TTL prevents
keys from leaking permanently if the server crashes before a DECR.
On any Redis failure the limiter fails open (allows the request) so a Redis
outage never takes down the API entirely.
"""

import logging
from typing import Optional

import redis

logger = logging.getLogger(__name__)

# Maximum simultaneous in-flight requests allowed per user
MAX_CONCURRENT = 3

# TTL (seconds) reset on every acquire — guards against leaked keys after a crash
_SAFETY_TTL = 300

# Redis key pattern for per-user counters
_KEY_PREFIX = "in_flight:"


class ConcurrencyLimiter:
    """Atomic per-user slot counter using Redis INCR / DECR."""

    def __init__(self, redis_client: Optional[redis.Redis]):
        # None redis_client → fail-open mode (no Redis available)
        self._redis = redis_client

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def acquire(self, user_id: str) -> bool:
        """
        Attempt to reserve a slot for user_id.

        Returns True if the slot was granted (counter was ≤ MAX_CONCURRENT),
        False if the user is already at the limit.  Fails open on Redis errors.
        """
        if self._redis is None:
            return True  # No Redis → always allow

        key = _KEY_PREFIX + user_id
        try:
            # Atomically increment and read the new value
            count = int(self._redis.incr(key))  # type: ignore[arg-type]

            if count > MAX_CONCURRENT:
                # Over the limit — roll back immediately
                self._decr_clamped(key)
                return False

            # Slot granted — reset the safety TTL so the key never leaks
            self._redis.expire(key, _SAFETY_TTL)
            return True

        except redis.RedisError as exc:
            logger.warning("ConcurrencyLimiter.acquire failed (fail-open): %s", exc)
            return True  # Fail open

    def release(self, user_id: str) -> None:
        """
        Release a previously acquired slot.

        Safe to call even if acquire() failed or Redis is unavailable — it
        is always a no-op in those cases.  Clamps the counter to 0 to prevent
        negative values from accumulating due to mismatched calls.
        """
        if self._redis is None:
            return

        key = _KEY_PREFIX + user_id
        try:
            self._decr_clamped(key)
        except redis.RedisError as exc:
            logger.warning("ConcurrencyLimiter.release failed: %s", exc)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _decr_clamped(self, key: str) -> None:
        """DECR the key then clamp to 0 if negative (defensive guard)."""
        assert self._redis is not None
        value = int(self._redis.decr(key))  # type: ignore[arg-type]
        if value < 0:
            self._redis.set(key, 0)
