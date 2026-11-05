import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.exceptions import MoodleException, UnauthorizedError
from app.routers import auth, courses, assignments, grades, system


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print("=" * 60)
    print("[*] MOODLE CONNECTOR & PORTAL STARTED")
    print(f"[*] Target Moodle LMS: {settings.clean_moodle_url}")
    print(f"[*] Service: {settings.MOODLE_SERVICE_SHORTNAME}")
    print(f"[*] Mock Mode: {settings.MOODLE_MOCK_MODE}")
    print("=" * 60)
    yield


app = FastAPI(
    title="Moodle LMS Connector & Portal",
    description="Secure FastAPI connector and web interface for Moodle LMS (UCU)",
    version="1.0.0",
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
    settings = get_settings()
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "moodle_url": settings.clean_moodle_url,
            "mock_mode": settings.MOODLE_MOCK_MODE,
        },
    )
