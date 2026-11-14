import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.exceptions import MoodleException, UnauthorizedError
from app.core.authorities import get_authority, list_authorities
from app.routers import auth, courses, assignments, grades, system, events, authorities, workspace


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print("=" * 60)
    print("[*] UNIVERSAL MOODLE CONNECTOR & EVENT BUS STARTED")
    print(f"[*] Default Moodle URL: {settings.clean_moodle_url}")
    print(f"[*] Service: {settings.MOODLE_SERVICE_SHORTNAME}")
    print(f"[*] Mock Mode: {settings.MOODLE_MOCK_MODE}")
    print("=" * 60)
    yield


app = FastAPI(
    title="Universal Moodle Connector & Event Portal",
    description="High-performance, event-driven connector and dashboard for any Moodle LMS instance",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(assignments.router)
app.include_router(grades.router)
app.include_router(system.router)
app.include_router(events.router)
app.include_router(authorities.router)
app.include_router(workspace.router)

# Mount Static & Templates
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")
templates_dir = os.path.join(current_dir, "templates")

os.makedirs(static_dir, exist_ok=True)
os.makedirs(templates_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)


@app.get("/", response_class=HTMLResponse)
async def serve_dashboard(request: Request):
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
