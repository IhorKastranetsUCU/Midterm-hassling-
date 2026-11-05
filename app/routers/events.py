import asyncio
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl

from app.core.events import event_bus, AcademicEvent
from app.core.security import get_current_user_session
from app.services.event_monitor import event_monitor
from app.services.moodle_client import MoodleClient

router = APIRouter(prefix="/api/events", tags=["Events & Notifications"])


class WebhookRegistration(BaseModel):
    url: str
    secret: Optional[str] = None


@router.get("/stream")
async def sse_event_stream(
    request: Request,
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    """
    Live Server-Sent Events (SSE) feed for the authenticated user.
    Streams deadline warnings, newly graded items, and system events in real-time.
    Ultra-low overhead: zero WebSockets framing, natively supported by modern browsers.
    """
    user_id = session.get("user_id")
    queue = event_bus.subscribe(user_id=user_id)

    async def event_generator():
        try:
            # Yield initial connection confirmation
            init_event = AcademicEvent(
                type="system.connected",
                title="⚡ Event Stream Connected",
                message="Listening for real-time academic events and deadlines.",
                severity="info",
                user_id=user_id,
            )
            yield init_event.to_sse_format()

            while True:
                # Disconnect check
                if await request.is_disconnected():
                    break

                try:
                    # Wait for next event with a 15-second heartbeat timeout
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield event.to_sse_format()
                except asyncio.TimeoutError:
                    # Send comment heartbeat to keep connection alive through proxies
                    yield ": heartbeat\n\n"

        finally:
            event_bus.unsubscribe(queue, user_id=user_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("", response_model=List[AcademicEvent])
async def list_recent_events(session: Dict[str, Any] = Depends(get_current_user_session)):
    """Fetch recent academic events for the current user."""
    return event_bus.get_recent_events(user_id=session.get("user_id"))


@router.post("/scan", response_model=List[AcademicEvent])
async def trigger_event_scan(session: Dict[str, Any] = Depends(get_current_user_session)):
    """
    Scan Moodle courses, assignments, and grades to detect and emit new events.
    """
    client = MoodleClient(base_url=session.get("site_url"))
    events = await event_monitor.scan_user_events(
        user_id=session["user_id"],
        client=client,
        token=session["moodle_token"],
        auth_type=session.get("auth_type", "token"),
        sesskey=session.get("sesskey"),
    )
    return events


@router.post("/test", response_model=AcademicEvent)
async def trigger_test_event(session: Dict[str, Any] = Depends(get_current_user_session)):
    """Emit a test event to verify the live notification stream."""
    test_event = AcademicEvent(
        type="assignment.due_soon",
        title="🔔 Test Event: Assignment Due Soon",
        message="This is a real-time event dispatched via the in-memory Event Bus!",
        severity="warning",
        user_id=session.get("user_id"),
        data={"test": True},
    )
    await event_bus.publish(test_event)
    return test_event


@router.post("/webhooks")
async def register_webhook(
    hook: WebhookRegistration,
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    """
    Register an outgoing webhook URL (e.g., Telegram bot, Discord channel, AWS SNS).
    Whenever an academic event fires, it will be POSTed to this URL.
    """
    event_bus.add_webhook(url=hook.url, secret=hook.secret)
    return {"success": True, "message": f"Webhook registered for {hook.url}"}
