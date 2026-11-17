"""Bounded, short-lived academic snapshots isolated by Moodle site and user."""
import asyncio
from collections import OrderedDict
from collections.abc import Coroutine, Hashable
from copy import deepcopy
from threading import RLock
import time
from typing import Any


class AcademicCache:
    def __init__(self, max_entries: int = 512, clock=time.monotonic):
        self._entries: OrderedDict[tuple[str, str, str, str], tuple[float, Any]] = OrderedDict()
        self._limit = max(1, max_entries)
        self._clock = clock
        self._lock = RLock()

    @staticmethod
    def _identity(site_url, user_id):
        site = str(site_url or "").strip().rstrip("/")
        if not site or user_id is None:
            return None
        return site, str(user_id)

    def _key(self, site_url, user_id, namespace, key):
        identity = self._identity(site_url, user_id)
        return (*identity, str(namespace), str(key)) if identity else None

    def get(self, site_url, user_id, namespace, key="all"):
        cache_key = self._key(site_url, user_id, namespace, key)
        with self._lock:
            entry = self._entries.get(cache_key)
            if entry is None:
                return None
            expires, value = entry
            if expires <= self._clock():
                self._entries.pop(cache_key, None)
                return None
            self._entries.move_to_end(cache_key)
            return deepcopy(value)

    def set(self, site_url, user_id, namespace, value, key="all", ttl_seconds=300.0):
        cache_key = self._key(site_url, user_id, namespace, key)
        if cache_key is None:
            return
        with self._lock:
            now = self._clock()
            for expired in [k for k, (expires, _) in self._entries.items() if expires <= now]:
                self._entries.pop(expired, None)
            if ttl_seconds <= 0:
                self._entries.pop(cache_key, None)
                return
            self._entries[cache_key] = (now + ttl_seconds, deepcopy(value))
            self._entries.move_to_end(cache_key)
            while len(self._entries) > self._limit:
                self._entries.popitem(last=False)

    def invalidate_key(self, site_url, user_id, namespace, key="all"):
        with self._lock:
            self._entries.pop(self._key(site_url, user_id, namespace, key), None)

    def invalidate_user(self, site_url, user_id):
        identity = self._identity(site_url, user_id)
        if identity is None:
            return
        with self._lock:
            for key in [key for key in self._entries if key[:2] == identity]:
                self._entries.pop(key, None)


_cache = AcademicCache()
_tasks: dict[tuple[asyncio.AbstractEventLoop, Hashable], asyncio.Task] = {}
_task_lock = RLock()


def get_academic_cache():
    return _cache


def schedule_background_task(coroutine: Coroutine, *, dedup_key: Hashable | None = None):
    """Keep one task per key and event loop; consume background failures safely."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        coroutine.close()
        return None
    key = (loop, dedup_key if dedup_key is not None else object())
    with _task_lock:
        previous = _tasks.get(key)
        if previous is not None and not previous.done():
            coroutine.close()
            return previous
        task = loop.create_task(coroutine)
        _tasks[key] = task

    def finished(done):
        with _task_lock:
            if _tasks.get(key) is done:
                _tasks.pop(key, None)
        if not done.cancelled():
            done.exception()

    task.add_done_callback(finished)
    return task
