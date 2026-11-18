import asyncio
import inspect

import pytest

from app.services.academic_cache import AcademicCache, schedule_background_task


def test_cache_isolates_site_user_namespace_and_course():
    cache = AcademicCache()
    cache.set("https://one.example/", 7, "grades", {"mark": 100}, key="42")
    assert cache.get("https://one.example", "7", "grades", "42") == {"mark": 100}
    assert cache.get("https://two.example", 7, "grades", "42") is None
    assert cache.get("https://one.example", 8, "grades", "42") is None
    assert cache.get("https://one.example", 7, "assignments", "42") is None
    assert cache.get("https://one.example", 7, "grades", "43") is None


def test_expiration_uses_monotonic_clock_and_empty_results_are_cached():
    clock = [10.0]
    cache = AcademicCache(clock=lambda: clock[0])
    cache.set("https://one.example", 7, "courses", [], ttl_seconds=5)
    clock[0] = 14.9
    assert cache.get("https://one.example", 7, "courses") == []
    clock[0] = 15.0
    assert cache.get("https://one.example", 7, "courses") is None


def test_cached_payload_is_not_mutated_by_callers():
    cache = AcademicCache()
    value = [{"id": 1}]
    cache.set("https://one.example", 7, "courses", value)
    value[0]["id"] = 2
    result = cache.get("https://one.example", 7, "courses")
    result.append({"id": 3})
    assert cache.get("https://one.example", 7, "courses") == [{"id": 1}]


def test_eviction_keeps_recent_entries_and_invalidations_are_scoped():
    cache = AcademicCache(max_entries=2)
    cache.set("https://one.example", 7, "grades", 1, key="1")
    cache.set("https://one.example", 8, "grades", 2, key="2")
    cache.get("https://one.example", 7, "grades", "1")
    cache.set("https://two.example", 7, "grades", 3, key="3")
    assert cache.get("https://one.example", 8, "grades", "2") is None
    cache.invalidate_user("https://one.example", 7)
    assert cache.get("https://one.example", 7, "grades", "1") is None
    assert cache.get("https://two.example", 7, "grades", "3") == 3
    cache.invalidate_key("https://two.example", 7, "grades", "3")
    assert cache.get("https://two.example", 7, "grades", "3") is None


def test_unknown_identities_are_not_shared():
    cache = AcademicCache()
    cache.set(None, 7, "courses", [1])
    cache.set("https://one.example", None, "courses", [2])
    assert cache.get(None, 7, "courses") is None
    assert cache.get("https://one.example", None, "courses") is None


@pytest.mark.asyncio
async def test_background_checks_deduplicate_and_allow_retry_after_completion():
    event = asyncio.Event()
    called = []

    async def work():
        called.append(True)
        await event.wait()

    first = schedule_background_task(work(), dedup_key=("owner", 42))
    duplicate = work()
    assert schedule_background_task(duplicate, dedup_key=("owner", 42)) is first
    assert inspect.getcoroutinestate(duplicate) == inspect.CORO_CLOSED
    await asyncio.sleep(0)
    assert len(called) == 1
    event.set()
    await first
    following = schedule_background_task(work(), dedup_key=("owner", 42))
    assert following is not first
    await following
    assert len(called) == 2


@pytest.mark.asyncio
async def test_a_failed_background_check_does_not_block_future_checks():
    async def broken():
        raise ValueError("Unavailable upstream")

    first = schedule_background_task(broken(), dedup_key=("owner", 1))
    with pytest.raises(ValueError):
        await first
    following = schedule_background_task(asyncio.sleep(0), dedup_key=("owner", 1))
    assert following is not first
    await following


def test_no_event_loop_closes_unscheduled_coroutines():
    coroutine = asyncio.sleep(0)
    assert schedule_background_task(coroutine, dedup_key="no-loop") is None
    assert inspect.getcoroutinestate(coroutine) == inspect.CORO_CLOSED
