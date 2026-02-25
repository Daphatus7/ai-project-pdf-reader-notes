# Feature: Per-User Concurrent Request Limiter

**Date:** 2026-02-24

## Problem

The `/llm/chat` endpoint had no concurrency control. A single user could send unlimited
parallel requests, exhausting FastAPI's thread pool and degrading service quality for
all other users.

## Solution

Introduced a Redis-backed atomic counter per user that caps simultaneous in-flight
requests at **3**. A 4th concurrent request from the same user receives **HTTP 429**.
The slot is always released in a `try/finally` block, so crashes or exceptions never
leak counters permanently.

## New Files

| File | Purpose |
|------|---------|
| `src/backend/services/concurrency_limiter.py` | `ConcurrencyLimiter` class — Redis `INCR`/`DECR`, safety TTL, fail-open |

## Modified Files

| File | Change |
|------|--------|
| `src/backend/api/deps.py` | Added `get_concurrency_limiter()` FastAPI dependency |
| `src/backend/api/v1/llm.py` | Wired limiter into `chat` endpoint with `try/finally` release |
| `src/backend/tests/test_llm_service.py` | Added Section 9 (tests 42-48) |

## Design Details

- **Key pattern:** `in_flight:{user_id}` in Redis
- **Limit:** `MAX_CONCURRENT = 3`
- **Safety TTL:** 300 s, reset on every `acquire()` — prevents leaked keys if server crashes
- **Fail-open:** Any `RedisError` is caught, logged as WARNING, and the request is allowed through
- **Independence:** Each user has their own counter; one user at the limit does not affect others

## Tests Added (42-48)

| Test | Description |
|------|-------------|
| 42 | 3 acquires → all True |
| 43 | 4th acquire → False |
| 44 | Release frees a slot for the next acquire |
| 45 | Release after exception path allows next acquire |
| 46 | User A at limit does not block User B |
| 47 | Redis unavailable → fail-open (always True) |
| 48 | HTTP layer: 4th concurrent request returns 429 |
