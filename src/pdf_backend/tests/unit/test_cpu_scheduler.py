"""
Unit tests for CpuScheduler against a 12-core MacBook configuration.

Key behaviors verified:
  1. Dynamic scale — first/only job gets ALL available cores (12), not tier limit.
  2. Blocking — second job waits when pool is exhausted; unblocks on release.
  3. Tier limits — when active_jobs > 0, tier quota applies (free=1, pro=4).
  4. Core accounting — available + in-use == total, always.
"""
import threading
import time

import pytest

from src.pdf_backend.services.cpu_scheduler import CpuScheduler


# ── Dynamic scale (lone job gets full 12 cores) ───────────────────────────────

class TestDynamicScale:
    def test_free_tier_lone_job_gets_all_12_cores(self, scheduler_12):
        cores = scheduler_12.acquire("free")
        try:
            assert cores == 12, f"Expected 12 (dynamic scale), got {cores}"
            assert scheduler_12._available == 0
            assert scheduler_12._active_jobs == 1
        finally:
            scheduler_12.release(cores)

    def test_pro_tier_lone_job_gets_all_12_cores(self, scheduler_12):
        cores = scheduler_12.acquire("pro")
        try:
            assert cores == 12, f"Expected 12 (dynamic scale), got {cores}"
        finally:
            scheduler_12.release(cores)

    def test_after_release_available_fully_restored(self, scheduler_12):
        cores = scheduler_12.acquire("free")
        scheduler_12.release(cores)
        assert scheduler_12._available == 12
        assert scheduler_12._active_jobs == 0


# ── Core accounting invariant ─────────────────────────────────────────────────

class TestCoreAccounting:
    def test_available_decreases_on_acquire(self, scheduler_12):
        assert scheduler_12._available == 12
        cores = scheduler_12.acquire("free")
        assert scheduler_12._available == 0   # all 12 gone (dynamic scale)
        scheduler_12.release(cores)

    def test_active_jobs_increments_and_decrements(self, scheduler_12):
        assert scheduler_12._active_jobs == 0
        cores = scheduler_12.acquire("pro")
        assert scheduler_12._active_jobs == 1
        scheduler_12.release(cores)
        assert scheduler_12._active_jobs == 0

    def test_available_never_exceeds_total_after_release(self, scheduler_12):
        cores = scheduler_12.acquire("free")
        scheduler_12.release(cores)
        # Releasing 0 extra should not corrupt the pool
        scheduler_12.release(0)
        assert scheduler_12._available <= 12


# ── Blocking / concurrency ────────────────────────────────────────────────────

class TestConcurrentBlocking:
    def test_second_free_job_blocks_while_first_holds_all_cores(self, scheduler_12):
        """
        Job-1 holds all 12 cores. Job-2 (free) must block until Job-1 releases.
        After release, active_jobs resets to 0 so Job-2 also gets 12 via dynamic scale.
        """
        acquired_by_job2: list[int] = []
        thread_started = threading.Event()

        def job2():
            thread_started.set()
            cores = scheduler_12.acquire("free")
            acquired_by_job2.append(cores)
            scheduler_12.release(cores)

        cores1 = scheduler_12.acquire("free")
        t = threading.Thread(target=job2, daemon=True)
        t.start()
        thread_started.wait(timeout=1.0)
        time.sleep(0.1)  # Give job2 time to hit the condition wait

        assert len(acquired_by_job2) == 0, "Job-2 should be blocked"

        scheduler_12.release(cores1)
        t.join(timeout=3.0)

        assert not t.is_alive(), "Job-2 thread should have completed"
        assert len(acquired_by_job2) == 1
        # active_jobs was 0 when job2 woke up → dynamic scale
        assert acquired_by_job2[0] == 12

    def test_second_pro_job_blocks_then_unblocks(self, scheduler_12):
        """Pro tier job also blocks when pool is exhausted."""
        acquired_by_job2: list[int] = []

        def job2():
            cores = scheduler_12.acquire("pro")
            acquired_by_job2.append(cores)
            scheduler_12.release(cores)

        cores1 = scheduler_12.acquire("pro")
        t = threading.Thread(target=job2, daemon=True)
        t.start()
        time.sleep(0.1)

        assert len(acquired_by_job2) == 0, "Job-2 should be blocked"
        scheduler_12.release(cores1)
        t.join(timeout=3.0)

        assert len(acquired_by_job2) == 1
        assert acquired_by_job2[0] == 12

    def test_three_jobs_run_one_at_a_time(self, scheduler_12):
        """
        On a 12-core machine with dynamic scale, jobs cannot overlap:
        Job-1 takes all cores → Job-2 and Job-3 queue → run sequentially.
        """
        order: list[str] = []
        order_lock = threading.Lock()

        def worker(name: str):
            cores = scheduler_12.acquire("free")
            with order_lock:
                order.append(f"{name}_start")
            time.sleep(0.05)
            with order_lock:
                order.append(f"{name}_end")
            scheduler_12.release(cores)

        cores1 = scheduler_12.acquire("free")
        t2 = threading.Thread(target=worker, args=("job2",), daemon=True)
        t3 = threading.Thread(target=worker, args=("job3",), daemon=True)
        t2.start()
        t3.start()
        time.sleep(0.05)  # Let both threads reach blocking wait

        scheduler_12.release(cores1)
        t2.join(timeout=5.0)
        t3.join(timeout=5.0)

        assert not t2.is_alive() and not t3.is_alive(), "Both jobs should complete"
        # Start events must not interleave — each job runs to completion before the next starts
        starts = [e for e in order if e.endswith("_start")]
        ends = [e for e in order if e.endswith("_end")]
        assert len(starts) == 2 and len(ends) == 2
        # Verify sequential: every start is immediately followed by its end
        assert order.index("job2_end") < order.index("job3_start") or \
               order.index("job3_end") < order.index("job2_start"), \
               f"Jobs overlapped: {order}"


# ── Tier limits (when active_jobs > 0) ───────────────────────────────────────

class TestTierLimitsWithActiveJob:
    """
    Tier limits (free=1, pro=4) only apply when at least one other job is active.
    We inject scheduler state directly to test this code path without running
    two real concurrent jobs (which would deadlock on a 12-core machine where
    Job-1 always grabs all cores first).
    """

    def test_free_tier_gets_1_core_when_pool_partially_full(self, scheduler_12):
        s = scheduler_12
        # Simulate: 8 cores in use, 4 free, 1 active job
        with s._condition:
            s._available = 4
            s._active_jobs = 1

        cores = s.acquire("free")
        try:
            assert cores == 1, f"Expected tier limit (1), got {cores}"
        finally:
            s.release(cores)
            with s._condition:
                s._available = 12
                s._active_jobs = 0

    def test_pro_tier_gets_4_cores_when_pool_has_enough(self, scheduler_12):
        s = scheduler_12
        # Simulate: 4 cores available, 1 active job
        with s._condition:
            s._available = 4
            s._active_jobs = 1

        cores = s.acquire("pro")
        try:
            assert cores == 4, f"Expected tier limit (4), got {cores}"
        finally:
            s.release(cores)
            with s._condition:
                s._available = 12
                s._active_jobs = 0

    def test_pro_tier_blocks_when_only_3_cores_available(self, scheduler_12):
        """Pro needs 4 cores; with only 3 available and an active job, it blocks."""
        s = scheduler_12
        acquired: list[int] = []

        def try_acquire():
            c = s.acquire("pro")
            acquired.append(c)
            s.release(c)

        with s._condition:
            s._available = 3
            s._active_jobs = 1

        t = threading.Thread(target=try_acquire, daemon=True)
        t.start()
        time.sleep(0.1)
        assert len(acquired) == 0, "Pro job should block with only 3 cores"

        # Free enough and remove active job so pro can proceed
        with s._condition:
            s._available = 12
            s._active_jobs = 0
            s._condition.notify_all()

        t.join(timeout=3.0)
        assert len(acquired) == 1
