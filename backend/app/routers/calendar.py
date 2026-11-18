"""Calendar API: external sync (Google Calendar & iCal .ics), sleep/forbidden rules, and AI scheduling."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import JSONResponse, PlainTextResponse, RedirectResponse
from pydantic import BaseModel, Field

from app.config import get_settings
from app.core.security import (
    WorkspaceOwner,
    create_session_jwt,
    decode_session_jwt,
    get_optional_platform_session,
    get_workspace_owner,
    resolve_workspace_owner,
)
from app.core.exceptions import UnauthorizedError
from app.services.academic_cache import get_academic_cache
from app.services.calendar_scheduler import CalendarScheduler
from app.services.calendar_service import (
    CalendarConflictError,
    CalendarServiceError,
    get_calendar_store,
    parse_utc_iso,
    resolve_timezone,
    to_utc_iso,
)
from app.services.learning_provider import LearningSettingsStore, learning_provider_scope
from app.services.workspace_store import get_workspace_store

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])


class ForbiddenWindowModel(BaseModel):
    id: Optional[str] = None
    label: str = "Заборонений час"
    start_time: str
    end_time: str
    weekdays: List[int] = Field(default_factory=list)
    enabled: bool = True


class CalendarSettingsPatch(BaseModel):
    timezone: Optional[str] = None
    sleep_enabled: Optional[bool] = None
    sleep_start: Optional[str] = None
    sleep_end: Optional[str] = None
    forbidden_windows: Optional[List[ForbiddenWindowModel]] = None
    avoid_conflicts: Optional[bool] = None
    buffer_minutes: Optional[int] = Field(default=None, ge=0, le=60)
    default_session_minutes: Optional[int] = Field(default=None, ge=15, le=240)
    max_daily_study_minutes: Optional[int] = Field(default=None, ge=30, le=720)
    sync_deadlines: Optional[bool] = None


class CalendarEventCreate(BaseModel):
    title: str
    start_at: str
    end_at: str
    description: str = ""
    all_day: bool = False
    course_id: Optional[int] = None
    topic_index: Optional[int] = None
    source_type: str = "manual"
    allow_conflict: bool = False


class CalendarEventPatch(BaseModel):
    title: Optional[str] = None
    start_at: Optional[str] = None
    end_at: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    allow_conflict: bool = False


class IcsUrlRequest(BaseModel):
    title: str = "Зовнішній календар"
    url: str


class ScheduleBlockRequest(BaseModel):
    course_id: Optional[int] = None
    course_title: str = ""
    topic_index: Optional[int] = None
    topic_title: str = ""
    title: str = ""
    description: str = ""
    duration_minutes: Optional[int] = Field(default=None, ge=15, le=240)
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    preferred_part_of_day: Optional[str] = None
    horizon_days: int = Field(default=7, ge=1, le=30)


class AiPlanRequest(BaseModel):
    prompt: str = ""
    days: int = Field(default=7, ge=1, le=14)
    sync_external: bool = True


class GoogleCalendarChoice(BaseModel):
    id: str
    summary: str = ""


class GoogleCalendarsSelectRequest(BaseModel):
    calendars: List[GoogleCalendarChoice]


async def _load_owner_deadlines(request: Request, owner: WorkspaceOwner) -> List[Dict[str, Any]]:
    settings = get_settings()
    raw_jwt = request.cookies.get(settings.COOKIE_NAME)
    if not raw_jwt:
        return []
    try:
        moodle_session = decode_session_jwt(raw_jwt, settings)
    except UnauthorizedError:
        return []
    platform_claims = get_optional_platform_session(request, settings)
    if platform_claims and moodle_session.get("owner_id") not in {None, owner.owner_id}:
        return []

    site_url = moodle_session.get("site_url")
    user_id = moodle_session.get("user_id")
    if not site_url or not user_id:
        return []

    cache = get_academic_cache()
    cached = cache.get(site_url, user_id, "assignments", "all")
    if cached is not None and getattr(cached, "assignments", None):
        return [a.model_dump() if hasattr(a, "model_dump") else dict(a) for a in cached.assignments]

    try:
        from app.routers.assignments import get_my_assignments
        resp = await get_my_assignments(course_id=None, refresh=False, session=moodle_session)
        return [a.model_dump() if hasattr(a, "model_dump") else dict(a) for a in resp.assignments]
    except Exception:
        return []


def _public_settings(settings_dict: Dict[str, Any], request: Request) -> Dict[str, Any]:
    out = dict(settings_dict)
    token = out.pop("feed_token", None)
    app_settings = get_settings()
    base = str(request.base_url).rstrip("/")
    if app_settings.HUSTLE_PUBLIC_ORIGIN and not base.startswith(("https://hustle", "http://127.0.0.1", "http://localhost")):
        base = app_settings.HUSTLE_PUBLIC_ORIGIN.rstrip("/")
    out["ics_feed_url"] = f"{base}/api/calendar/feed/{token}.ics" if token else None
    out["google_oauth_available"] = bool(app_settings.GOOGLE_CLIENT_ID and app_settings.GOOGLE_CLIENT_SECRET)
    return out


@router.get("/overview")
async def get_calendar_overview(
    request: Request,
    start: Optional[str] = Query(default=None),
    end: Optional[str] = Query(default=None),
    planner: Literal["week", "month"] = "week",
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    store = get_calendar_store()
    cfg = store.get_settings(owner.owner_id)
    local_tz = resolve_timezone(cfg["timezone"])
    now_local = datetime.now(local_tz)
    if start and end:
        start_utc = parse_utc_iso(start)
        end_utc = parse_utc_iso(end)
    else:
        monday = now_local.date() - timedelta(days=now_local.weekday())
        start_utc = datetime.combine(monday, datetime.min.time(), tzinfo=local_tz).astimezone(timezone.utc)
        end_utc = start_utc + timedelta(days=7)

    scheduler = CalendarScheduler(store)
    events = store.list_events(owner.owner_id, start_utc, end_utc)
    forbidden_blocks = store.expand_forbidden_intervals(cfg, start_utc, end_utc)
    free_slots = [] if planner == "month" else scheduler.find_available_slots(owner.owner_id, datetime.now(timezone.utc), max(end_utc, datetime.now(timezone.utc) + timedelta(days=7)))
    sources = store.list_sources(owner.owner_id)

    reviews = store.deadline_reviews(owner.owner_id)
    deadlines: List[Dict[str, Any]] = []
    if cfg.get("sync_deadlines", True):
        raw_dl = await _load_owner_deadlines(request, owner)
        ws_courses = {c.course_id for c in get_workspace_store().list_courses(owner.owner_id)}
        s_ts, e_ts = int(start_utc.timestamp()), int(end_utc.timestamp())
        for dl in raw_dl:
            due = int(dl.get("duedate") or 0)
            if due <= 0 or due < s_ts or due >= e_ts:
                continue
            if ws_courses and int(dl.get("course_id", 0)) not in ws_courses:
                continue
            deadlines.append({
                "id": dl.get("id"),
                "cmid": dl.get("cmid"),
                "course_id": dl.get("course_id"),
                "course_name": dl.get("course_name"),
                "name": dl.get("name"),
                "duedate": due,
                "due_at": to_utc_iso(datetime.fromtimestamp(due, tz=timezone.utc)),
                "review": reviews.get((dl.get("course_id"), dl.get("id")), "pending"),
            })

    return {
        "range": {"start_at": to_utc_iso(start_utc), "end_at": to_utc_iso(end_utc)},
        "settings": _public_settings(cfg, request),
        "sources": sources,
        "events": events,
        "forbidden_blocks": forbidden_blocks,
        "deadlines": deadlines,
        "free_slots": free_slots[:20],
    }


@router.get("/deadlines/reviews")
def accepted_deadline_keys(owner: WorkspaceOwner = Depends(get_workspace_owner)):
    reviews = get_calendar_store().deadline_reviews(owner.owner_id)
    return {"accepted": [f"{course_id}/{assignment_id}"
                         for (course_id, assignment_id), decision in reviews.items()
                         if decision == "accepted"]}


@router.put("/deadlines/{course_id}/{assignment_id}")
async def review_deadline(
    course_id: int, assignment_id: int, request: Request,
    decision: Literal["accepted", "declined"], owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    source = await _load_owner_deadlines(request, owner)
    deadline = next((d for d in source if d.get("course_id") == course_id and d.get("id") == assignment_id), None)
    if not deadline or not deadline.get("duedate"):
        raise HTTPException(status_code=404, detail="Дедлайн більше недоступний у Moodle.")
    store = get_calendar_store()
    event, created = store.review_deadline(owner.owner_id, course_id, assignment_id, deadline, decision)
    if created:
        await store.push_event_to_google(owner.owner_id, event)
    return {"decision": decision, "event": event}


@router.get("/settings")
async def get_calendar_settings(request: Request, owner: WorkspaceOwner = Depends(get_workspace_owner)):
    store = get_calendar_store()
    return _public_settings(store.get_settings(owner.owner_id), request)


@router.put("/settings")
async def update_calendar_settings(
    req: CalendarSettingsPatch,
    request: Request,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    store = get_calendar_store()
    patch = req.model_dump(exclude_none=True)
    if "forbidden_windows" in patch:
        patch["forbidden_windows"] = [w.model_dump() if hasattr(w, "model_dump") else w for w in (req.forbidden_windows or [])]
    try:
        updated = store.save_settings(owner.owner_id, patch)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return _public_settings(updated, request)


@router.post("/settings/feed-token/rotate")
async def rotate_ics_feed_token(request: Request, owner: WorkspaceOwner = Depends(get_workspace_owner)):
    store = get_calendar_store()
    store.rotate_feed_token(owner.owner_id)
    return _public_settings(store.get_settings(owner.owner_id), request)


@router.get("/events")
async def list_calendar_events(
    start: Optional[str] = Query(default=None),
    end: Optional[str] = Query(default=None),
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    store = get_calendar_store()
    s_utc = parse_utc_iso(start) if start else None
    e_utc = parse_utc_iso(end) if end else None
    return {"events": store.list_events(owner.owner_id, s_utc, e_utc)}


@router.post("/events")
async def create_calendar_event(
    req: CalendarEventCreate,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    store = get_calendar_store()
    try:
        start_utc = parse_utc_iso(req.start_at)
        end_utc = parse_utc_iso(req.end_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Невірний формат дати/часу.")

    src_type = "ai_study" if req.source_type == "ai_study" else "manual"
    ev = store.create_event(
        owner.owner_id,
        title=req.title,
        start_utc=start_utc,
        end_utc=end_utc,
        source_type=src_type,
        description=req.description,
        all_day=req.all_day,
        course_id=req.course_id,
        topic_index=req.topic_index,
        status="planned",
        created_by="user",
        check_conflicts=True,
        allow_conflict=req.allow_conflict,
    )
    gid = await store.push_event_to_google(owner.owner_id, ev)
    if gid:
        ev = store.get_event(owner.owner_id, ev["event_id"]) or ev
    return {"event": ev}


@router.patch("/events/{event_id}")
async def update_calendar_event(
    event_id: str,
    req: CalendarEventPatch,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    store = get_calendar_store()
    ev = store.update_event(
        owner.owner_id,
        event_id,
        req.model_dump(exclude_none=True),
        allow_conflict=req.allow_conflict,
    )
    if ev.get("google_event_id") and ev.get("source_id") is None:
        await store.push_event_to_google(owner.owner_id, ev)
    return {"event": ev}


@router.delete("/events/{event_id}")
async def delete_calendar_event(
    event_id: str,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    store = get_calendar_store()
    removed = store.delete_event(owner.owner_id, event_id)
    if removed is None:
        raise HTTPException(status_code=404, detail="Подію не знайдено.")
    if removed.get("google_event_id") and removed.get("source_id") is None:
        await store.delete_event_from_google(owner.owner_id, removed["google_event_id"])
    return {"success": True, "event_id": event_id}


@router.post("/sources/ics")
async def connect_ics_url(req: IcsUrlRequest, owner: WorkspaceOwner = Depends(get_workspace_owner)):
    store = get_calendar_store()
    source = await store.add_ics_url_source(owner.owner_id, req.title, req.url)
    return {"source": source}


@router.post("/sources/ics-upload")
async def upload_ics_file(
    file: UploadFile = File(...),
    title: str = Form("Імпортований .ics"),
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл календаря перевищує 5 МБ.")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1", errors="ignore")
    store = get_calendar_store()
    source = store.import_ics_text(owner.owner_id, title or file.filename or "Імпортований .ics", text)
    return {"source": source}


@router.post("/sources/{source_id}/sync")
async def sync_one_source(source_id: str, owner: WorkspaceOwner = Depends(get_workspace_owner)):
    store = get_calendar_store()
    sources = {s["source_id"]: s for s in store.list_sources(owner.owner_id)}
    src = sources.get(source_id)
    if src is None:
        raise HTTPException(status_code=404, detail="Джерело не знайдено.")
    if src["provider"] == "google":
        synced = await store.sync_google_source(owner.owner_id)
    elif src["provider"] == "ics_url":
        synced = await store.sync_ics_source(owner.owner_id, source_id)
    else:
        synced = src
    return {"source": synced}


@router.post("/sync")
async def sync_all_calendar_sources(owner: WorkspaceOwner = Depends(get_workspace_owner)):
    return await get_calendar_store().sync_all_sources(owner.owner_id)


@router.delete("/sources/{source_id}")
async def disconnect_calendar_source(source_id: str, owner: WorkspaceOwner = Depends(get_workspace_owner)):
    if not get_calendar_store().delete_source(owner.owner_id, source_id):
        raise HTTPException(status_code=404, detail="Джерело не знайдено.")
    return {"success": True}


@router.get("/google/connect")
async def connect_google_calendar(
    request: Request,
    redirect: bool = Query(default=True),
    view: Literal["workspace", "paper"] = "workspace",
):
    """Start Google OAuth2 flow requesting Google Calendar scopes, reusing GOOGLE_REDIRECT_URI."""
    settings = get_settings()
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth не налаштований на сервері. Використай синхронізацію через посилання iCal (.ics).",
        )

    out_res: Response = JSONResponse({}) if not redirect else RedirectResponse(url="/hustle/app.html#calendar", status_code=status.HTTP_302_FOUND)
    owner = resolve_workspace_owner(request, response=out_res, auto_issue=True)

    state_nonce = secrets.token_urlsafe(24)
    state_jwt = create_session_jwt(
        {
            "token_type": "oauth_state",
            "oauth_state": state_nonce,
            "purpose": "calendar_connect",
            "calendar_view": view,
            "owner_id": owner.owner_id,
        },
        settings,
    )
    params = urlencode(
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
            "state": state_nonce,
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
        }
    )
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{params}"

    if not redirect:
        import json as _json
        out_res.body = _json.dumps({"auth_url": auth_url}).encode("utf-8")
        out_res.headers["content-length"] = str(len(out_res.body))
    else:
        out_res.headers["location"] = auth_url

    out_res.set_cookie(
        key="google_oauth_state",
        value=state_jwt,
        max_age=600,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return out_res


@router.get("/google/calendars")
async def list_google_calendar_choices(owner: WorkspaceOwner = Depends(get_workspace_owner)):
    store = get_calendar_store()
    return {"calendars": await store.list_google_calendars(owner.owner_id)}


@router.put("/google/calendars")
async def select_google_calendars(
    req: GoogleCalendarsSelectRequest,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    store = get_calendar_store()
    selected = store.set_google_selected_calendars(
        owner.owner_id,
        [c.model_dump() for c in req.calendars],
    )
    synced = await store.sync_google_source(owner.owner_id)
    return {"selected": selected, "source": synced}


@router.post("/ai/schedule-block")
async def ai_schedule_study_block(
    req: ScheduleBlockRequest,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    """Reusable AI/infra action: allocate N study minutes for a course without violating sleep or busy slots."""
    ws_store = get_workspace_store()
    course_title = req.course_title
    if req.course_id is not None and not course_title:
        bundle = ws_store.get_course_bundle(owner.owner_id, req.course_id)
        if bundle:
            course_title = bundle["course"]["title"]

    scheduler = CalendarScheduler()
    event = await scheduler.schedule_study_block(
        owner.owner_id,
        course_id=req.course_id,
        course_title=course_title,
        topic_index=req.topic_index,
        topic_title=req.topic_title,
        title=req.title,
        description=req.description,
        duration_minutes=req.duration_minutes,
        preferred_date=req.preferred_date,
        preferred_time=req.preferred_time,
        preferred_part_of_day=req.preferred_part_of_day,
        horizon_days=req.horizon_days,
        created_by="ai",
        sync_google=True,
    )
    return {"event": event}


@router.post("/ai/plan")
async def ai_plan_calendar(
    req: AiPlanRequest,
    request: Request,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    ws_store = get_workspace_store()
    provider = LearningSettingsStore(ws_store.db_path).get(owner.owner_id)
    if not provider:
        return JSONResponse(
            status_code=400,
            content={"detail": "Підключи Gemini API key в налаштуваннях, щоб ШІ міг планувати розклад за текстовим запитом."},
        )

    courses = [
        c.model_dump() if hasattr(c, "model_dump") else dict(c)
        for c in ws_store.list_courses(owner.owner_id)
    ]
    deadlines = await _load_owner_deadlines(request, owner)
    scheduler = CalendarScheduler()
    with learning_provider_scope(provider):
        result = await scheduler.plan_with_ai(
            owner.owner_id,
            prompt=req.prompt,
            courses=courses,
            deadlines=deadlines,
            days=req.days,
            sync_external=req.sync_external,
        )
    return result


@router.get("/export.ics")
async def export_owner_ics(
    request: Request,
    include_deadlines: bool = Query(default=True),
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    deadlines = await _load_owner_deadlines(request, owner) if include_deadlines else []
    body = get_calendar_store().export_ics(owner.owner_id, deadlines=deadlines)
    return PlainTextResponse(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="hustle-study.ics"'},
    )


@router.get("/feed/{feed_token}.ics")
async def public_ics_feed(feed_token: str):
    store = get_calendar_store()
    owner_id = store.get_owner_by_feed_token(feed_token)
    if not owner_id:
        raise HTTPException(status_code=404, detail="Calendar feed not found.")
    body = store.export_ics(owner_id, deadlines=None)
    return PlainTextResponse(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={"Cache-Control": "private, max-age=300"},
    )
