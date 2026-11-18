import json
import os
import re
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import hustle_extension
from app.core.exceptions import MoodleException, UnauthorizedError
from app.core.authorities import get_authority, list_authorities
from app.routers import auth, courses, assignments, grades, system, events, authorities, workspace, calendar
from app.services.build_queue import get_build_queue
from app.services.workspace_store import get_workspace_store
from app.routers import learning
from app.services.calendar_service import CalendarServiceError
from app.services.learning_provider import LearningProviderError


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print("=" * 60)
    print("[*] UNIVERSAL MOODLE CONNECTOR & EVENT BUS STARTED")
    print(f"[*] Default Moodle URL: {settings.clean_moodle_url}")
    print(f"[*] Service: {settings.MOODLE_SERVICE_SHORTNAME}")
    print(f"[*] Mock Mode: {settings.MOODLE_MOCK_MODE}")
    print("=" * 60)
    try:
        yield
    finally:
        get_build_queue().cancel_all()


app = FastAPI(
    title="Universal Moodle Connector & Event Portal",
    description="High-performance, event-driven connector and dashboard for any Moodle LMS instance",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS setup (explicit origin echoing for browser + extension credentials)
_cors_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=_cors_settings.CORS_ALLOW_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(MoodleException)
async def moodle_exception_handler(request: Request, exc: MoodleException):
    return JSONResponse(
        status_code=400,
        content={"detail": exc.message, "error_code": exc.error_code, "details": exc.details},
    )


@app.exception_handler(UnauthorizedError)
async def unauthorized_exception_handler(request: Request, exc: UnauthorizedError):
    return JSONResponse(
        status_code=401,
        content={"detail": exc.detail},
    )


# Include API Routers
@app.exception_handler(LearningProviderError)
async def learning_provider_error(request: Request, exc: LearningProviderError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message}, headers={"Cache-Control": "no-store"})


@app.exception_handler(CalendarServiceError)
async def calendar_service_error(request: Request, exc: CalendarServiceError):
    payload: dict = {"detail": exc.message}
    if hasattr(exc, "conflicts") and exc.conflicts:
        payload["conflicts"] = exc.conflicts
    return JSONResponse(status_code=exc.status_code, content=payload, headers={"Cache-Control": "no-store"})


app.include_router(learning.router)
app.include_router(hustle_extension.router)
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(assignments.router)
app.include_router(grades.router)
app.include_router(system.router)
app.include_router(events.router)
app.include_router(authorities.router)
app.include_router(workspace.router)
app.include_router(calendar.router)

# Mount Static & Templates from frontend/
current_dir = Path(__file__).resolve().parent
repo_root = current_dir.parent.parent
frontend_dir = repo_root / "frontend"
static_dir = str(frontend_dir / "static")
hustle_dir = str(frontend_dir / "hustle")
templates_dir = str(frontend_dir / "templates")

os.makedirs(static_dir, exist_ok=True)
os.makedirs(hustle_dir, exist_ok=True)
os.makedirs(templates_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")
@app.get("/hustle/", include_in_schema=False)
@app.get("/hustle/index.html", include_in_schema=False)
async def open_landing():
    return RedirectResponse("/prototype/", status_code=307)


@app.get("/hustle/app.html", include_in_schema=False)
async def open_workspace(request: Request):
    # Browsers carry the original fragment through this redirect, including Moodle deep links.
    target = "/prototype/app.html"
    if request.url.query:
        target += "?" + request.url.query
    return RedirectResponse(target, status_code=307, headers={"Cache-Control": "no-store"})


@app.get("/hustle/tools.html", response_class=HTMLResponse, include_in_schema=False)
async def course_tools():
    source = (Path(hustle_dir) / "app.html").read_text(encoding="utf-8")
    return HTMLResponse(source.replace("<head>", '<head><link rel="stylesheet" href="/prototype/course-tools.css">'
                                       '<script defer src="/prototype/course-tools.js"></script>'),
                        headers={"Cache-Control": "no-cache"})


app.mount("/hustle", StaticFiles(directory=hustle_dir, html=True), name="hustle")
prototype_dir = frontend_dir / "prototype"


@app.get("/prototype/", response_class=HTMLResponse, include_in_schema=False)
@app.get("/prototype/index.html", response_class=HTMLResponse, include_in_schema=False)
async def paper_landing():
    page = (prototype_dir / "index.html").read_text(encoding="utf-8")
    return HTMLResponse(page.replace('href="register.html', 'href="/hustle/signin.html'),
                        headers={"Cache-Control": "no-cache"})


@app.get("/prototype/register.html", include_in_schema=False)
async def open_signin(request: Request):
    query = "?" + request.url.query if request.url.query else ""
    return RedirectResponse("/hustle/signin.html" + query, status_code=307)


@app.get("/prototype/connect.html", include_in_schema=False)
async def open_moodle_connection():
    return RedirectResponse("/hustle/connect.html", status_code=307)


@app.get("/prototype/app.html", response_class=HTMLResponse)
async def paper_workspace(request: Request, response: Response):
    page = (prototype_dir / "app.html").read_text(encoding="utf-8")
    page = re.sub(r"<script data-standalone\b[^>]*></script>", "", page)
    # Issue the same owner cookie as the API before any parallel calendar or course requests.
    response.headers["Cache-Control"] = "private, no-store"
    account = await auth.get_auth_status(request, response)
    courses = get_workspace_store().list_courses(owner_id=account.owner_id, moodle_only=True)
    bootstrap = {
        "owner": account.owner_id, "name": account.fullname or account.moodle_username,
        "paired": account.moodle_paired, "moodle": account.moodle_url,
        "courses": [{"course_id": c.course_id, "title": c.title, "topic_count": c.topic_count,
                     "source_type": c.source_type} for c in courses],
    }
    payload = json.dumps(bootstrap, ensure_ascii=True).replace("<", "\\u003c")
    page = page.replace("<head>", '<head><script type="application/json" id="workspace-account">'
                        + payload + '</script>')
    calendar_assets = (
        '<link rel="stylesheet" href="/hustle/calendar.css">'
        '<link rel="stylesheet" href="calendar-connected.css">'
        '<script defer src="/hustle/ui.js"></script>'
        '<script defer src="/hustle/calendar.js"></script>'
        '<script defer src="/hustle/student-home.js"></script>'
        '<script defer src="/hustle/dashboard-today.js"></script>'
        '<link rel="stylesheet" href="/hustle/moodle-picker.css">'
        '<script defer src="/hustle/moodle-picker.js"></script>'
        '<script defer src="paper-workspace.js"></script>'
        '<script defer src="calendar-connected.js"></script>'
        '<link rel="stylesheet" href="/hustle/oral-defense.css">'
        '<script defer src="/hustle/oral-defense.js"></script>'
        '<script defer src="oral-practice.js"></script>'
    )
    return page.replace("<!-- connected-calendar -->", calendar_assets)


app.mount("/prototype", StaticFiles(directory=prototype_dir, html=True), name="prototype")
templates = Jinja2Templates(directory=templates_dir)


@app.get("/", response_class=HTMLResponse)
async def serve_dashboard(request: Request):
    if get_settings().HUSTLE_PAPER_HOME:
        return RedirectResponse("/prototype/", status_code=307)
    default_auth = get_authority("ucu")
    settings = get_settings()
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "authority": default_auth,
            "authorities": list_authorities(),
            "moodle_url": default_auth.base_url if default_auth else settings.clean_moodle_url,
            "mock_mode": settings.MOODLE_MOCK_MODE,
        },
    )


@app.get("/courses/{course_id}", response_class=HTMLResponse)
async def serve_course_page(request: Request, course_id: int):
    default_auth = get_authority("ucu")
    settings = get_settings()
    return templates.TemplateResponse(
        request=request,
        name="course.html",
        context={
            "authority": default_auth,
            "course_id": course_id,
            "moodle_url": default_auth.base_url if default_auth else settings.clean_moodle_url,
            "mock_mode": settings.MOODLE_MOCK_MODE,
        },
    )


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)


@app.get("/healthz", include_in_schema=False)
async def liveness_healthcheck():
    """Lightweight local liveness probe with no external Moodle calls."""
    return {"status": "ok"}


# Authority-specific routes: /{authority} and /{authority}/courses
@app.get("/{authority_slug}", response_class=HTMLResponse)
async def serve_authority_dashboard(request: Request, authority_slug: str):
    auth_data = get_authority(authority_slug)
    if not auth_data:
        raise HTTPException(status_code=404, detail=f"Authority '{authority_slug}' not found.")
    settings = get_settings()
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "authority": auth_data,
            "authorities": list_authorities(),
            "moodle_url": auth_data.base_url,
            "mock_mode": auth_data.is_mock or settings.MOODLE_MOCK_MODE,
        },
    )


@app.get("/{authority_slug}/courses", response_class=HTMLResponse)
async def serve_authority_courses_tab(request: Request, authority_slug: str):
    return await serve_authority_dashboard(request, authority_slug)


@app.get("/{authority_slug}/courses/{course_id}", response_class=HTMLResponse)
async def serve_authority_course_page(request: Request, authority_slug: str, course_id: int):
    auth_data = get_authority(authority_slug)
    if not auth_data:
        raise HTTPException(status_code=404, detail=f"Authority '{authority_slug}' not found.")
    settings = get_settings()
    return templates.TemplateResponse(
        request=request,
        name="course.html",
        context={
            "authority": auth_data,
            "course_id": course_id,
            "moodle_url": auth_data.base_url,
            "mock_mode": auth_data.is_mock or settings.MOODLE_MOCK_MODE,
        },
    )
