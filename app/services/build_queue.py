import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, Optional, Tuple

from app.config import get_settings

logger = logging.getLogger("workspace_build_queue")


class DebouncedBuildQueue:
    """
    Lightweight per-(owner, course, job_type) debounced asyncio task queue.
    Coalesces rapid bursts of file uploads or Moodle edits so heavy rebuilds execute once.
    """

    def __init__(self) -> None:
        self._timers: Dict[Tuple[str, int, str], asyncio.Task] = {}
        self._jobs: Dict[Tuple[str, int, str], Dict[str, Any]] = {}
        self._factories: Dict[Tuple[str, int, str], Callable[[], Awaitable[Any]]] = {}
        self._semaphore: Optional[asyncio.Semaphore] = None
        self._semaphore_limit: int = 0

    def _get_semaphore(self) -> asyncio.Semaphore:
        limit = max(1, int(get_settings().BUILD_MAX_CONCURRENCY))
        if self._semaphore is None or self._semaphore_limit != limit:
            self._semaphore = asyncio.Semaphore(limit)
            self._semaphore_limit = limit
        return self._semaphore

    def schedule(
        self,
        owner_id: str,
        course_id: int,
        job_type: str,
        coro_factory: Callable[[], Awaitable[Any]],
        debounce_seconds: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Schedule (or reset) a debounced background build task."""
        key = (owner_id, course_id, job_type)
        delay = (
            float(debounce_seconds)
            if debounce_seconds is not None
            else float(get_settings().BUILD_DEBOUNCE_SECONDS)
        )

        prev_task = self._timers.get(key)
        if prev_task and not prev_task.done():
            prev_task.cancel()

        prev_state = self._jobs.get(key, {})
        state = {
            "owner_id": owner_id,
            "course_id": course_id,
            "job_type": job_type,
            "status": "debouncing",
            "debounce_seconds": delay,
            "scheduled_count": int(prev_state.get("scheduled_count", 0)) + 1,
            "executions": int(prev_state.get("executions", 0)),
            "last_error": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._jobs[key] = state
        self._factories[key] = coro_factory

        async def _runner() -> None:
            try:
                if delay > 0:
                    await asyncio.sleep(delay)
                async with self._get_semaphore():
                    state["status"] = "running"
                    state["updated_at"] = datetime.now(timezone.utc).isoformat()
                    await coro_factory()
                    state["status"] = "completed"
                    state["executions"] = int(state.get("executions", 0)) + 1
                    state["updated_at"] = datetime.now(timezone.utc).isoformat()
            except asyncio.CancelledError:
                return
            except Exception as exc:
                logger.warning(f"Background build failed for {key}: {exc}")
                state["status"] = "failed"
                state["last_error"] = str(exc)
                state["updated_at"] = datetime.now(timezone.utc).isoformat()
            finally:
                if self._timers.get(key) is asyncio.current_task():
                    self._timers.pop(key, None)

        self._timers[key] = asyncio.create_task(_runner())
        return dict(state)

    async def flush_course(self, owner_id: str, course_id: int) -> int:
        """Run any pending debounced jobs for this course immediately (e.g. when student opens Exam tab)."""
        matching = [
            key for key, t in list(self._timers.items())
            if key[0] == owner_id and key[1] == course_id and not t.done()
        ]
        executed = 0
        for key in matching:
            task = self._timers.pop(key, None)
            if task and not task.done():
                task.cancel()
            factory = self._factories.get(key)
            state = self._jobs.get(key)
            if factory and state:
                state["status"] = "running"
                state["updated_at"] = datetime.now(timezone.utc).isoformat()
                try:
                    async with self._get_semaphore():
                        await factory()
                    state["status"] = "completed"
                    state["executions"] = int(state.get("executions", 0)) + 1
                    state["updated_at"] = datetime.now(timezone.utc).isoformat()
                    executed += 1
                except Exception as exc:
                    state["status"] = "failed"
                    state["last_error"] = str(exc)
                    state["updated_at"] = datetime.now(timezone.utc).isoformat()
        return executed

    def get_jobs(self, owner_id: str, course_id: int) -> list[Dict[str, Any]]:
        """Inspect scheduled/recent build queue jobs for one user's course."""
        return [
            dict(state)
            for key, state in self._jobs.items()
            if key[0] == owner_id and key[1] == course_id
        ]

    def cancel_job(self, owner_id: str, course_id: int, job_type: str) -> bool:
        """Cancel a pending debounced job (e.g. when user triggers immediate manual refresh)."""
        key = (owner_id, course_id, job_type)
        task = self._timers.pop(key, None)
        if task and not task.done():
            task.cancel()
            if key in self._jobs:
                self._jobs[key]["status"] = "cancelled"
                self._jobs[key]["updated_at"] = datetime.now(timezone.utc).isoformat()
            return True
        return False

    def cancel_all(self) -> None:
        for task in list(self._timers.values()):
            if not task.done():
                task.cancel()
        self._timers.clear()


_build_queue: Optional[DebouncedBuildQueue] = None


def get_build_queue() -> DebouncedBuildQueue:
    global _build_queue
    if _build_queue is None:
        _build_queue = DebouncedBuildQueue()
    return _build_queue
