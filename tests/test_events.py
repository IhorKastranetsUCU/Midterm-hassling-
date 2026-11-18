from app.config import get_settings
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.events import AcademicEvent, EventBus

client = TestClient(app)


def test_event_bus_publish_and_subscribe():
    bus = EventBus()
    q = bus.subscribe(user_id=101)

    event = AcademicEvent(
        type="assignment.due_soon",
        title="Due Tomorrow",
        message="Math Homework is due",
        severity="warning",
        user_id=101,
    )
    import asyncio
    asyncio.run(bus.publish(event))

    assert not q.empty()
    received = q.get_nowait()
    assert received.title == "Due Tomorrow"
    assert received.type == "assignment.due_soon"

    recent = bus.get_recent_events(user_id=101)
    assert len(recent) == 1
    assert recent[0].title == "Due Tomorrow"


def test_events_api_endpoints(monkeypatch):
    monkeypatch.setattr(get_settings(), "MOODLE_MOCK_MODE", True)
    # Login first
    login_res = client.post(
        "/api/auth/login",
        json={"username": "demo", "password": "demopassword"}
    )
    assert login_res.status_code == 200
    cookies = login_res.cookies

    # Test trigger test event
    test_evt_res = client.post("/api/events/test", cookies=cookies)
    assert test_evt_res.status_code == 200
    evt_data = test_evt_res.json()
    assert evt_data["type"] == "assignment.due_soon"
    assert "id" in evt_data

    # Test list events
    list_res = client.get("/api/events", cookies=cookies)
    assert list_res.status_code == 200
    events = list_res.json()
    assert len(events) >= 1

    # Test scan events
    scan_res = client.post("/api/events/scan", cookies=cookies)
    assert scan_res.status_code == 200
    assert isinstance(scan_res.json(), list)

    # Test register webhook
    hook_res = client.post(
        "/api/events/webhooks",
        json={"url": "https://example.com/webhook"},
        cookies=cookies,
    )
    assert hook_res.status_code == 200
    assert hook_res.json()["success"] is True
