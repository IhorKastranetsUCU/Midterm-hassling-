import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Set, AsyncGenerator, List
from pydantic import BaseModel, Field
import httpx

logger = logging.getLogger("moodle_events")


class AcademicEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = Field(..., description="Event type: assignment.due_soon, grade.new, system.status, etc.")
    title: str
    message: str
    severity: str = "info"  # info, success, warning, danger
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[int] = None
    owner_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

    def to_sse_format(self) -> str:
        """Formats the event as an HTTP Server-Sent Event (SSE)."""
        payload = {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "severity": self.severity,
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id,
            "data": self.data or {},
        }
        return f"event: {self.type}\ndata: {json.dumps(payload)}\n\n"


class EventBus:
    """
    Ultra-low-resource, zero-cost in-memory asynchronous Event Bus.
    Supports:
    1. Real-time Server-Sent Events (SSE) streaming to browser clients.
    2. Zero external dependencies (no Redis, Kafka, or heavy message brokers).
    3. Outgoing Webhooks (Telegram bots, Discord, Slack, external APIs).
    """

    def __init__(self):
        # Maps user_id (or 'global') to a set of active asyncio subscriber queues
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._webhooks: List[Dict[str, Any]] = []
        self._recent_events: List[AcademicEvent] = []
        self._max_recent = 50

    def subscribe(self, user_id: Optional[str] = None) -> asyncio.Queue:
        """Register a new consumer queue for Server-Sent Events."""
        key = str(user_id) if user_id else "global"
        if key not in self._subscribers:
            self._subscribers[key] = set()

        queue = asyncio.Queue(maxsize=100)
        self._subscribers[key].add(queue)
        logger.debug(f"New SSE subscriber for '{key}'. Total: {len(self._subscribers[key])}")
        return queue

    def unsubscribe(self, queue: asyncio.Queue, user_id: Optional[str] = None):
        """Remove a disconnected subscriber queue."""
        key = str(user_id) if user_id else "global"
        if key in self._subscribers and queue in self._subscribers[key]:
            self._subscribers[key].remove(queue)
            if not self._subscribers[key]:
                del self._subscribers[key]
            logger.debug(f"Unsubscribed SSE client for '{key}'")

    async def publish(self, event: AcademicEvent):
        """
        Broadcast an event to matching subscribers and trigger any outgoing webhooks.
        """
        # Save in rolling history buffer
        self._recent_events.insert(0, event)
        if len(self._recent_events) > self._max_recent:
            self._recent_events.pop()

        # 1. Distribute strictly to matching owner/user queues unless truly global
        if event.user_id is None and event.owner_id is None:
            targets = ["global"]
        else:
            targets = []
            if event.user_id is not None:
                targets.append(str(event.user_id))
            if event.owner_id is not None:
                targets.append(event.owner_id)

        for target_key in targets:
            subscribers = self._subscribers.get(target_key, set())
            dead_queues = []
            for queue in subscribers:
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    dead_queues.append(queue)
            for dead in dead_queues:
                subscribers.discard(dead)

        # 2. Fire webhooks asynchronously in background (fire-and-forget, zero latency)
        if self._webhooks:
            asyncio.create_task(self._dispatch_webhooks(event))

    async def _dispatch_webhooks(self, event: AcademicEvent):
        """Deliver event payload to external webhook URLs."""
        payload = event.model_dump(mode="json")
        for hook in self._webhooks:
            url = hook.get("url")
            if not url:
                continue
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    await client.post(url, json=payload, headers={"User-Agent": "Moodle-Connector-Webhook/1.0"})
            except Exception as e:
                logger.warning(f"Failed to deliver webhook to {url}: {e}")

    def add_webhook(self, url: str, secret: Optional[str] = None):
        """Register an external webhook URL (e.g. Telegram/Discord bridge)."""
        self._webhooks.append({"url": url, "secret": secret})

    def get_recent_events(
        self,
        user_id: Optional[int] = None,
        owner_id: Optional[str] = None,
        limit: int = 15,
    ) -> List[AcademicEvent]:
        """Return recently fired events visible to this user/owner."""
        if user_id is None and owner_id is None:
            return [e for e in self._recent_events if e.user_id is None and e.owner_id is None][:limit]
        return [
            e for e in self._recent_events
            if (e.user_id is None and e.owner_id is None)
            or (user_id is not None and e.user_id == user_id)
            or (owner_id is not None and e.owner_id == owner_id)
        ][:limit]


# Global EventBus singleton instance
event_bus = EventBus()
