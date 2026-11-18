import asyncio
import json
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services import build_queue as bq
from app.services import calendar_service as cs
from app.services import workspace_store as ws
from app.services.build_queue import DebouncedBuildQueue
from app.services.calendar_scheduler import CalendarScheduler
from app.services.calendar_service import CalendarStore, parse_ics_events, resolve_timezone
from app.services.gemini_service import GeminiService
from app.services.learning_provider import LearningSettingsStore
from app.services.workspace_store import WorkspaceStore


@pytest.fixture
def cal_env(tmp_path, monkeypatch):
    db_file = str(tmp_path / "workspace.db")
    monkeypatch.setattr(get_settings(), "GEMINI_API_KEY", "")
    monkeypatch.setattr(get_settings(), "VERTEX_AI_PROJECT", None)
    monkeypatch.setattr(get_settings(), "MOODLE_MOCK_MODE", False)
    monkeypatch.setattr(get_settings(), "WORKSPACE_DB_PATH", db_file)
    monkeypatch.setattr(get_settings(), "GOOGLE_CLIENT_ID", "")
    monkeypatch.setattr(get_settings(), "GOOGLE_CLIENT_SECRET", "")

    ws_store = WorkspaceStore(db_file)
    cal_store = CalendarStore(db_file)
    queue = DebouncedBuildQueue()
    monkeypatch.setattr(ws, "_store_instance", ws_store)
    monkeypatch.setattr(cs, "_calendar_store", cal_store)
    monkeypatch.setattr(bq, "_build_queue", queue)
    yield TestClient(app), ws_store, cal_store
    queue.cancel_all()


def test_sleep_and_forbidden_hours_and_existing_event_conflict_blocking(cal_env):
    client, _, cal_store = cal_env
    # Configure Kyiv timezone, sleep 23:00-08:00, custom forbidden Mon-Sun 10:00-12:00.
    upd = client.put("/api/calendar/settings", json={
        "timezone": "Europe/Kyiv",
        "sleep_enabled": True,
        "sleep_start": "23:00",
        "sleep_end": "08:00",
        "avoid_conflicts": True,
        "forbidden_windows": [
            {"label": "Пари", "start_time": "10:00", "end_time": "12:00", "weekdays": [], "enabled": True}
        ],
    })
    assert upd.status_code == 200, upd.text
    assert upd.json()["sleep_start"] == "23:00"

    # Attempt event during sleep hours (01:00-02:00 UTC => 03:00-04:00 Kyiv) -> 409 Conflict.
    day = (datetime.now(timezone.utc) + timedelta(days=2)).date()
    sleep_res = client.post("/api/calendar/events", json={
        "title": "Нічне читання",
        "start_at": f"{day.isoformat()}T01:00:00+00:00",
        "end_at": f"{day.isoformat()}T02:00:00+00:00",
    })
    assert sleep_res.status_code == 409
    assert "Сон" in sleep_res.json()["detail"]

    # Attempt event during custom forbidden window (10:30-11:30 Kyiv = 08:30-09:30 UTC in winter or 07:30 in summer).
    kyiv = resolve_timezone("Europe/Kyiv")
    fb_start = datetime(day.year, day.month, day.day, 10, 30, tzinfo=kyiv).astimezone(timezone.utc)
    fb_end = fb_start + timedelta(hours=1)
    fb_res = client.post("/api/calendar/events", json={
        "title": "Читання під час пар",
        "start_at": fb_start.isoformat(),
        "end_at": fb_end.isoformat(),
    })
    assert fb_res.status_code == 409
    assert "Пари" in fb_res.json()["detail"]

    # Create valid event in free slot (14:00-15:00 Kyiv).
    ok_start = datetime(day.year, day.month, day.day, 14, 0, tzinfo=kyiv).astimezone(timezone.utc)
    ok_end = ok_start + timedelta(hours=1)
    ok_res = client.post("/api/calendar/events", json={
        "title": "Лаба з алгоритмів",
        "start_at": ok_start.isoformat(),
        "end_at": ok_end.isoformat(),
    })
    assert ok_res.status_code == 200, ok_res.text

    # Overlapping event at 14:30-15:30 Kyiv -> 409 citing existing event.
    ov_res = client.post("/api/calendar/events", json={
        "title": "Інше заняття",
        "start_at": (ok_start + timedelta(minutes=30)).isoformat(),
        "end_at": (ok_end + timedelta(minutes=30)).isoformat(),
    })
    assert ov_res.status_code == 409
    assert "Лаба з алгоритмів" in ov_res.json()["detail"]

    # Explicit user manual override succeeds.
    override_res = client.post("/api/calendar/events", json={
        "title": "Термінова справа",
        "start_at": (ok_start + timedelta(minutes=30)).isoformat(),
        "end_at": (ok_end + timedelta(minutes=30)).isoformat(),
        "allow_conflict": True,
    })
    assert override_res.status_code == 200


def test_ai_scheduler_avoids_sleep_buffer_and_imported_ics_events(cal_env):
    client, _, cal_store = cal_env
    kyiv = resolve_timezone("Europe/Kyiv")
    target_day = (datetime.now(kyiv) + timedelta(days=3)).date()

    # Connect settings: sleep 23:00-08:00, 15m buffer, max 120m/day.
    assert client.put("/api/calendar/settings", json={
        "timezone": "Europe/Kyiv",
        "sleep_enabled": True,
        "sleep_start": "23:00",
        "sleep_end": "08:00",
        "avoid_conflicts": True,
        "buffer_minutes": 15,
        "max_daily_study_minutes": 120,
    }).status_code == 200

    # Import an .ics schedule blocking 08:00-12:00 Kyiv on target_day, plus a TRANSPARENT birthday.
    ics_payload = "\r\n".join([
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:uni-lecture-1",
        f"DTSTART;TZID=Europe/Kyiv:{target_day.strftime('%Y%m%d')}T080000",
        f"DTEND;TZID=Europe/Kyiv:{target_day.strftime('%Y%m%d')}T120000",
        "SUMMARY:Математика в університеті",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:free-note-1",
        f"DTSTART;TZID=Europe/Kyiv:{target_day.strftime('%Y%m%d')}T130000",
        f"DTEND;TZID=Europe/Kyiv:{target_day.strftime('%Y%m%d')}T140000",
        "TRANSP:TRANSPARENT",
        "SUMMARY:Нагадування без зайнятості",
        "END:VEVENT",
        "END:VCALENDAR",
    ])
    imp = client.post("/api/calendar/sources/ics-upload", data={"title": "Розклад"}, files={"file": ("uni.ics", ics_payload.encode("utf-8"), "text/calendar")})
    assert imp.status_code == 200, imp.text
    assert imp.json()["source"]["synced_events"] == 2

    # Schedule 60m on target_day: must skip 00:00-08:00 (sleep), 08:00-12:00 (ics) + 15m buffer (>= 12:15), and ignore TRANSPARENT event!
    sched = client.post("/api/calendar/ai/schedule-block", json={
        "course_title": "Основи національного спротиву",
        "duration_minutes": 60,
        "preferred_date": target_day.isoformat(),
        "horizon_days": 10,
    })
    assert sched.status_code == 200, sched.text
    ev = sched.json()["event"]
    s_local = datetime.fromisoformat(ev["start_at"]).astimezone(kyiv)
    assert s_local.date() == target_day
    assert s_local.hour >= 12 and (s_local.hour > 12 or s_local.minute >= 15)

    # Export .ics & private feed token check + rotation.
    exp = client.get("/api/calendar/export.ics")
    assert exp.status_code == 200
    assert "Основи національного спротиву" in exp.text
    assert "Математика в університеті" not in exp.text

    cfg = client.get("/api/calendar/settings").json()
    feed_path = "/" + "/".join(cfg["ics_feed_url"].split("/")[3:])
    assert client.get(feed_path).status_code == 200
    client.post("/api/calendar/settings/feed-token/rotate")
    assert client.get(feed_path).status_code == 404


def test_ics_rrule_parser_and_ssrf_guard():
    kyiv = resolve_timezone("Europe/Kyiv")
    win_start = datetime(2026, 11, 16, 0, 0, tzinfo=timezone.utc)
    win_end = datetime(2026, 11, 24, 0, 0, tzinfo=timezone.utc)
    ics = "\n".join([
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:weekly-class",
        "DTSTART;TZID=Europe/Kyiv:20261102T090000",
        "DURATION:PT1H30M",
        "RRULE:FREQ=WEEKLY;BYDAY=MO,WE",
        "SUMMARY:Семінар",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:cancelled-class",
        "DTSTART;TZID=Europe/Kyiv:20261117T100000",
        "DTEND;TZID=Europe/Kyiv:20261117T110000",
        "STATUS:CANCELLED",
        "SUMMARY:Скасовано",
        "END:VEVENT",
        "END:VCALENDAR",
    ])
    events = parse_ics_events(ics, kyiv, win_start, win_end)
    assert len(events) == 3  # Nov 16 (Mon), Nov 18 (Wed), Nov 23 (Mon)
    assert all(e["title"] == "Семінар" for e in events)

    # SSRF validation blocks private/metadata hosts
    store = CalendarStore(":memory:") if False else None
    from app.services.calendar_service import CalendarServiceError, _validate_ics_url
    for bad in ("http://127.0.0.1/cal.ics", "http://localhost:8080/a.ics", "http://169.254.169.254/latest/meta-data"):
        with pytest.raises(CalendarServiceError):
            _validate_ics_url(bad)


def test_ai_nl_planner_snaps_conflicting_gemini_proposal_to_safe_slot(cal_env, monkeypatch):
    client, ws_store, _ = cal_env
    created = client.post("/api/workspace/courses/create-text", json={
        "title": "Основи національного спротиву",
        "content_text": "Тактика підрозділів та виживання в польових умовах.",
        "tools_config": {"interactive_book": False, "flashcards": False, "practice_quizzes": False, "mermaid_diagrams": False, "visual_cards": False},
    })
    assert created.status_code == 200
    cid = created.json()["course_id"]
    bundle = client.get(f"/api/workspace/courses/{cid}").json()
    owner_id = bundle["course"]["owner_id"]

    # Without Gemini key, NL planner rejects honestly instead of inventing plans.
    no_key = client.post("/api/calendar/ai/plan", json={"prompt": "Приділи 1 годину курсу Основи національного спротиву"})
    assert no_key.status_code == 400

    LearningSettingsStore(ws_store.db_path).save(owner_id, "test-gemini-key", "gemini-3-flash-preview")
    kyiv = resolve_timezone("Europe/Kyiv")
    tomorrow = (datetime.now(kyiv) + timedelta(days=1)).date()

    # Gemini proposes 02:00 (during sleep!), deterministic scheduler must snap it to a safe non-sleep slot >= 08:00.
    async def fake_generate(self, prompt, system_instruction=None, json_mode=False, temperature=0.2, timeout=30.0, extra_parts=None):
        assert json_mode is True
        assert "Основи національного спротиву" in prompt
        return json.dumps({
            "assistant_message": "Заплановано 1 годину на Основи національного спротиву.",
            "sessions": [{
                "course_id": cid,
                "title": "Основи національного спротиву — опрацювання теми",
                "duration_minutes": 60,
                "preferred_date": tomorrow.isoformat(),
                "preferred_time": "02:00",
                "preferred_part_of_day": "morning",
            }],
        })

    monkeypatch.setattr(GeminiService, "generate_content", fake_generate)
    plan = client.post("/api/calendar/ai/plan", json={"prompt": "Приділи 1 годину курсу Основи національного спротиву завтра", "days": 5, "sync_external": False})
    assert plan.status_code == 200, plan.text
    body = plan.json()
    assert len(body["scheduled"]) == 1
    scheduled_start = datetime.fromisoformat(body["scheduled"][0]["start_at"]).astimezone(kyiv)
    assert 8 <= scheduled_start.hour < 22


@pytest.mark.parametrize(("query", "return_path"), [
    ("", "/hustle/app.html#calendar"),
    ("&view=paper", "/prototype/app.html#calendar"),
])
def test_google_calendar_oauth_callback_and_two_way_sync(cal_env, monkeypatch, query, return_path):
    client, _, cal_store = cal_env
    monkeypatch.setattr(get_settings(), "GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setattr(get_settings(), "GOOGLE_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setattr(get_settings(), "GOOGLE_REDIRECT_URI", "http://testserver/api/auth/google/callback")

    # Initialize workspace session cookie via calendar/google/connect?redirect=false.
    conn_res = client.get("/api/calendar/google/connect?redirect=false" + query)
    assert conn_res.status_code == 200
    auth_url = conn_res.json()["auth_url"]
    assert "calendar.events" in auth_url
    state_param = auth_url.split("state=")[1].split("&")[0]

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "oauth2.googleapis.com/token" in url:
            return httpx.Response(200, json={"access_token": "goog-access-123", "refresh_token": "goog-refresh-456", "expires_in": 3600})
        if "openidconnect.googleapis.com/v1/userinfo" in url:
            return httpx.Response(200, json={"email": "student@ucu.edu.ua"})
        if "googleapis.com/calendar/v3/users/me/calendarList" in url and request.method == "GET":
            return httpx.Response(200, json={"items": [
                {"id": "student@ucu.edu.ua", "summary": "student@ucu.edu.ua", "primary": True, "accessRole": "owner"},
                {"id": "psa25b@group.calendar.google.com", "summary": "PSA-25-B", "primary": False, "accessRole": "reader"},
            ]})
        if "googleapis.com/calendar/v3/calendars/psa25b%40group.calendar.google.com/events" in url and request.method == "GET":
            t0 = (datetime.now(timezone.utc) + timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
            return httpx.Response(200, json={"items": [
                {
                    "id": "psa-lec-1",
                    "summary": "Лекція PSA-25-B",
                    "start": {"dateTime": t0.isoformat()},
                    "end": {"dateTime": (t0 + timedelta(hours=1, minutes=30)).isoformat()},
                }
            ]})
        if "googleapis.com/calendar/v3/calendars/primary/events" in url and request.method == "GET":
            t0 = (datetime.now(timezone.utc) + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
            return httpx.Response(200, json={"items": [
                {
                    "id": "g-ev-1",
                    "summary": "Зустріч у Google",
                    "start": {"dateTime": t0.isoformat()},
                    "end": {"dateTime": (t0 + timedelta(hours=1)).isoformat()},
                },
                {
                    "id": "g-echo",
                    "summary": "Echo",
                    "extendedProperties": {"private": {"hustleEventId": "ev-local"}},
                    "start": {"dateTime": t0.isoformat()},
                    "end": {"dateTime": (t0 + timedelta(hours=1)).isoformat()},
                },
            ]})
        if "googleapis.com/calendar/v3/calendars/primary/events" in url and request.method == "POST":
            return httpx.Response(201, json={"id": "created-in-google-999"})
        if request.method == "DELETE":
            return httpx.Response(204)
        return httpx.Response(404)

    real_async_client = httpx.AsyncClient
    factory = lambda **kw: real_async_client(transport=httpx.MockTransport(handler))
    monkeypatch.setattr("app.routers.auth.httpx.AsyncClient", factory)
    monkeypatch.setattr("app.services.calendar_service.httpx.AsyncClient", factory)

    cb = client.get(f"/api/auth/google/callback?code=authcode&state={state_param}", follow_redirects=False)
    assert cb.status_code == 302
    assert cb.headers["location"] == return_path

    overview = client.get("/api/calendar/overview").json()
    assert any(s["provider"] == "google" and "student@ucu.edu.ua" in s["title"] for s in overview["sources"])
    assert any(e["title"] == "Зустріч у Google" and e["source_type"] == "google" for e in overview["events"])
    assert not any(e["title"] == "Echo" for e in overview["events"])
    # Check raw overview hides any access/refresh tokens
    assert "goog-access-123" not in json.dumps(overview)
    assert "goog-refresh-456" not in json.dumps(overview)

    # Scheduling an AI block pushes to Google Calendar and avoids the synced event.
    created_ai = client.post("/api/calendar/ai/schedule-block", json={
        "course_title": "Історія України",
        "duration_minutes": 60,
        "horizon_days": 3,
    })
    assert created_ai.status_code == 200, created_ai.text
    ai_ev = created_ai.json()["event"]
    assert ai_ev["google_event_id"] == "created-in-google-999"

    # Deleting the AI event succeeds and deletes from Google Calendar cleanly.
    deleted = client.delete(f"/api/calendar/events/{ai_ev['event_id']}")
    assert deleted.status_code == 200

    # List available Google calendars and select PSA-25-B alongside primary.
    cals = client.get("/api/calendar/google/calendars")
    assert cals.status_code == 200
    assert any(c["summary"] == "PSA-25-B" for c in cals.json()["calendars"])
    sel = client.put("/api/calendar/google/calendars", json={
        "calendars": [
            {"id": "primary", "summary": "Основний календар"},
            {"id": "psa25b@group.calendar.google.com", "summary": "PSA-25-B"},
        ]
    })
    assert sel.status_code == 200
    ov2 = client.get("/api/calendar/overview").json()
    assert any(e["title"] == "Лекція PSA-25-B" and "PSA-25-B" in e["description"] for e in ov2["events"])


def test_paper_deadline_review_is_personal_and_idempotent(cal_env, monkeypatch):
    client, _, _ = cal_env
    other = TestClient(app)
    due = (datetime.now(timezone.utc) + timedelta(days=3)).replace(microsecond=0)

    async def assignments(request, owner):
        return [{"course_id": 71, "id": 12, "name": "Семінар", "duedate": int(due.timestamp())}]

    monkeypatch.setattr("app.routers.calendar._load_owner_deadlines", assignments)
    review = "/api/calendar/deadlines/71/12"
    window = {"start": (due - timedelta(days=1)).isoformat(),
              "end": (due + timedelta(days=1)).isoformat(), "planner": "month"}

    def overview(browser):
        response = browser.get("/api/calendar/overview", params=window)
        assert response.status_code == 200
        return response.json()

    assert overview(client)["deadlines"][0]["review"] == "pending"
    assert client.put(review, params={"decision": "declined"}).status_code == 200
    assert overview(client)["deadlines"][0]["review"] == "declined"
    response = client.put(review, params={"decision": "accepted"})
    assert response.status_code == 200
    event_id = response.json()["event"]["event_id"]
    event_path = f"/api/calendar/events/{event_id}"
    later = due + timedelta(hours=4)
    moved = client.patch(event_path, json={"start_at": later.isoformat(),
                         "end_at": (later + timedelta(minutes=1)).isoformat(), "allow_conflict": True})
    assert moved.status_code == 200
    assert client.put(review, params={"decision": "accepted"}).json()["event"]["event_id"] == event_id
    mine = overview(client)
    assert mine["deadlines"][0]["review"] == "accepted"
    assert client.get("/api/calendar/deadlines/reviews").json() == {"accepted": ["71/12"]}
    assert len(mine["events"]) == 1
    assert datetime.fromisoformat(mine["events"][0]["start_at"]) == later
    assert datetime.fromisoformat(mine["events"][0]["moodle_due_at"]) == due
    theirs = overview(other)
    assert theirs["deadlines"][0]["review"] == "pending"
    assert other.get("/api/calendar/deadlines/reviews").json() == {"accepted": []}
    assert theirs["events"] == []
    assert client.delete(event_path).status_code == 200
    assert overview(client)["deadlines"][0]["review"] == "removed"
    assert client.get("/api/calendar/deadlines/reviews").json() == {"accepted": []}
    assert client.put(review, params={"decision": "accepted"}).status_code == 200
    assert len(overview(client)["events"]) == 1


def test_public_workspace_entry_uses_paper_planner_and_same_owner(cal_env):
    client, _, _ = cal_env
    landing = client.get("/hustle/")
    assert landing.url.path == "/prototype/"
    assert 'href="/hustle/signin.html?mode=login"' in landing.text
    entry = client.get("/hustle/app.html?source=signin", follow_redirects=False)
    assert entry.status_code == 307
    assert entry.headers["location"] == "/prototype/app.html?source=signin"
    page = client.get(entry.headers["location"])
    assert page.status_code == 200
    assert "no-store" in page.headers["cache-control"]
    assert 'src="data.js' not in page.text and 'src="calendar-sync.js' not in page.text
    for asset in ("paper-workspace.js", "dashboard.js", "deadline-visuals.js",
                  "calendar-connected.js", "oral-practice.js"):
        assert asset in page.text
        assert client.get("/prototype/" + asset).status_code == 200
    owner = client.get("/api/workspace/session").json()["owner_id"]
    assert json.dumps(owner) in page.text
    client.cookies.clear()
    other = client.get("/prototype/app.html")
    assert json.dumps(owner) not in other.text
