"""
Redis-backed CPU scheduler for cross-process core quota enforcement.

All running worker processes share a single global view of core availability
stored in Redis. A Lua script provides atomic check-and-acquire; pub/sub
notifies waiting workers the moment cores are freed.

Redis keys:
  cpu:available   — integer, currently available cores
  cpu:active_jobs — integer, number of jobs currently running
  cpu:released    — pub/sub channel, published to on every release
"""
import logging

import redis as redis_lib

from src.pdf_backend.services.server_config import get_worker_config, get_tier_config

logger = logging.getLogger(__name__)

_AVAILABLE_KEY   = "cpu:available"
_ACTIVE_KEY      = "cpu:active_jobs"
_RELEASE_CHANNEL = "cpu:released"

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
    room — then calls release(cores) when done.  All worker processes coordinate
    through the same Redis instance so the 32-core budget is enforced globally.

    Pass in the job's own redis client; the scheduler opens a separate
    connection internally for pub/sub (Redis-py requirement).
    """

    def __init__(self, redis_client: redis_lib.Redis) -> None:
        cfg = get_worker_config()
        self._total:   int  = cfg["total_cores"]
        self._dynamic: bool = cfg["dynamic_scale"]
        self._r = redis_client
        self._script = self._r.register_script(_ACQUIRE_LUA)

        # Seed keys only if absent — NX ensures only the first worker sets them.
        self._r.set(_AVAILABLE_KEY, self._total, nx=True)
        self._r.set(_ACTIVE_KEY,    0,            nx=True)

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
                     tier, requested, self._r.get(_AVAILABLE_KEY), self._r.get(_ACTIVE_KEY))

        # Subscribe BEFORE the first attempt to avoid missing a release
        # notification that arrives between a failed attempt and subscribe.
        pubsub = self._r.pubsub(ignore_subscribe_messages=True)
        pubsub.subscribe(_RELEASE_CHANNEL)

        try:
            while True:
                alloc = self._script(
                    keys=[_ACTIVE_KEY, _AVAILABLE_KEY],
                    args=[requested, self._total, "1" if self._dynamic else "0"],
                )
                cores = int(str(alloc)) if alloc is not None else -1
                if cores > 0:
                    logger.info("Acquired %d cores for %s tier", cores, tier)
                    logger.info("acquire() after: available=%s active=%s",
                                 self._r.get(_AVAILABLE_KEY), self._r.get(_ACTIVE_KEY))
                    return cores

                logger.info("acquire() waiting — available=%s active=%s",
                             self._r.get(_AVAILABLE_KEY), self._r.get(_ACTIVE_KEY))
                # Block up to 5 s for a release notification, then retry.
                pubsub.get_message(timeout=5.0)

        finally:
            pubsub.unsubscribe(_RELEASE_CHANNEL)
            pubsub.close()

    def release(self, cores: int) -> None:
        """Return cores to the global pool and wake any waiting workers."""
        pipe = self._r.pipeline()
        pipe.incrby(_AVAILABLE_KEY, cores)
        pipe.decr(_ACTIVE_KEY)
        pipe.publish(_RELEASE_CHANNEL, str(cores))
        pipe.execute()
        logger.info("Released %d cores", cores)
        logger.info("release() after: available=%s active=%s",
                     self._r.get(_AVAILABLE_KEY), self._r.get(_ACTIVE_KEY))
