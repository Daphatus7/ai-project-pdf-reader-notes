"""
Redis-backed CPU scheduler for cross-process core quota enforcement.

All running worker processes share a single global view of core availability
stored in Redis. A Lua script provides atomic check-and-acquire; pub/sub
notifies waiting workers the moment cores are freed.

Redis keys (namespaced by instance_id):
  cpu:{instance_id}:available   — integer, currently available cores
  cpu:{instance_id}:active_jobs — integer, number of jobs currently running
  cpu:{instance_id}:released    — pub/sub channel, published to on every release
"""
import logging
import os

import redis as redis_lib

from src.pdf_backend.services.server_config import get_tier_config

logger = logging.getLogger(__name__)

# Atomically attempt to acquire cores.
# Returns the number of cores allocated, or -1 if not enough are available.
_ACQUIRE_LUA = """
local active    = tonumber(redis.call('GET', KEYS[1]) or '0')
local available = tonumber(redis.call('GET', KEYS[2]) or '0')
local requested = tonumber(ARGV[1])
local total     = tonumber(ARGV[2])
local dynamic   = ARGV[3] == '1'

local alloc
if dynamic and active == 0 then
    alloc = math.min(total, available)
else
    alloc = requested
end

if available < alloc or alloc <= 0 then return -1 end

redis.call('DECRBY', KEYS[2], alloc)
redis.call('INCR',   KEYS[1])
return alloc
"""


class CpuScheduler:
    """
    Token-bucket CPU scheduler backed by Redis.

    Each job calls acquire(tier) — blocks until the global core pool has enough
    room — then calls release(cores) when done.

    Keys are namespaced by instance_id so multiple Railway instances don't
    interfere. Total cores are read from os.cpu_count() so the pool always
    reflects actual hardware. State is reset on init so stale counters from
    crashed jobs are cleared on every server startup.
    """

    def __init__(self, redis_client: redis_lib.Redis, instance_id: str = "default") -> None:
        self._total:   int  = os.cpu_count() or 1
        self._dynamic: bool = True
        self._r = redis_client

        # Namespace keys by instance so multiple deployments don't share state.
        self._available_key   = f"cpu:{instance_id}:available"
        self._active_key      = f"cpu:{instance_id}:active_jobs"
        self._release_channel = f"cpu:{instance_id}:released"

        self._script = self._r.register_script(_ACQUIRE_LUA)

        # Always reset on init — reflects real CPU count and clears stale state
        # from jobs that were killed without running their finally blocks.
        self._r.set(self._available_key, self._total)
        self._r.set(self._active_key, 0)
        logger.info("CpuScheduler init: instance=%s total_cores=%d (from os.cpu_count())",
                    instance_id, self._total)

    # ── Public API ────────────────────────────────────────────────────────────

    def acquire(self, tier: str) -> int:
        """
        Block until enough cores are available, then reserve them globally.
        Uses pub/sub so there is no busy-wait; wakes immediately when
        another job releases cores.  Falls back to a 5-second poll timeout
        to guard against missed messages.
        Returns the number of cores allocated.
        """
        requested = get_tier_config(tier)["cpu_cores"]
        logger.info("acquire() tier=%s requested=%d available=%s active=%s",
                     tier, requested, self._r.get(self._available_key), self._r.get(self._active_key))

        # Subscribe BEFORE the first attempt to avoid missing a release
        # notification that arrives between a failed attempt and subscribe.
        pubsub = self._r.pubsub(ignore_subscribe_messages=True)
        pubsub.subscribe(self._release_channel)

        try:
            while True:
                alloc = self._script(
                    keys=[self._active_key, self._available_key],
                    args=[requested, self._total, "1" if self._dynamic else "0"],
                )
                cores = int(str(alloc)) if alloc is not None else -1
                if cores > 0:
                    logger.info("Acquired %d cores for %s tier", cores, tier)
                    logger.info("acquire() after: available=%s active=%s",
                                 self._r.get(self._available_key), self._r.get(self._active_key))
                    return cores

                logger.info("acquire() waiting — available=%s active=%s",
                             self._r.get(self._available_key), self._r.get(self._active_key))
                # Block up to 5 s for a release notification, then retry.
                pubsub.get_message(timeout=5.0)

        finally:
            pubsub.unsubscribe(self._release_channel)
            pubsub.close()

    def release(self, cores: int) -> None:
        """Return cores to the global pool and wake any waiting workers."""
        pipe = self._r.pipeline()
        pipe.incrby(self._available_key, cores)
        pipe.decr(self._active_key)
        pipe.publish(self._release_channel, str(cores))
        pipe.execute()
        logger.info("Released %d cores", cores)
        logger.info("release() after: available=%s active=%s",
                     self._r.get(self._available_key), self._r.get(self._active_key))
