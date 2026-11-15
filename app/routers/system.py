import time
from typing import Dict, Any, Optional
from pydantic import BaseModel
import httpx
from fastapi import APIRouter
from app.config import get_settings

router = APIRouter(prefix="/api/system", tags=["System & Diagnostics"])


class PingResponse(BaseModel):
    status: str
    target_url: str
    latency_ms: float
    moodle_reachable: bool
    login_token_endpoint_ok: bool
    webservice_endpoint_ok: bool
    mock_mode: bool
    details: Optional[Dict[str, Any]] = None


@router.get("/health", response_model=PingResponse)
async def check_moodle_health():
    """
    Diagnostic endpoint that pings the configured Moodle instance (https://learn.ucu.edu.ua)
    and verifies that both the login token service and REST web service are responsive.
    """
    settings = get_settings()
    base_url = settings.clean_moodle_url
    start_time = time.time()

    token_ok = False
    ws_ok = False
    reachable = False
    details = {}

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            # 1. Ping main site
            res_main = await client.get(base_url)
            reachable = res_main.status_code == 200

            # 2. Check login/token.php
            res_token = await client.post(f"{base_url}/login/token.php", data={"service": settings.MOODLE_SERVICE_SHORTNAME})
            # Even on bad credentials, Moodle returns JSON with HTTP 200
            token_ok = res_token.status_code == 200 and "error" in res_token.text

            # 3. Check webservice/rest/server.php
            res_ws = await client.post(
                f"{base_url}/webservice/rest/server.php",
                data={"moodlewsrestformat": "json"}
            )
            ws_ok = res_ws.status_code == 200 and ("invalidtoken" in res_ws.text or "accessexception" in res_ws.text or "exception" in res_ws.text)

            details["status_code"] = res_main.status_code
    except Exception as exc:
        details["error"] = str(exc)

    latency_ms = round((time.time() - start_time) * 1000, 2)

    overall_status = "healthy" if (reachable and token_ok and ws_ok) else "degraded" if reachable else "unreachable"

    return PingResponse(
        status=overall_status,
        target_url=base_url,
        latency_ms=latency_ms,
        moodle_reachable=reachable,
        login_token_endpoint_ok=token_ok,
        webservice_endpoint_ok=ws_ok,
        mock_mode=settings.MOODLE_MOCK_MODE,
        details=details,
    )


class MoodleInspectResponse(BaseModel):
    target_url: str
    is_moodle: bool
    status_code: Optional[int] = None
    engine_detected: str
    has_moodle_session_cookie: bool = False
    has_login_php: bool = False
    has_token_service: bool = False
    has_rest_webservice: bool = False
    latency_ms: float
    recommendation: str


@router.get("/inspect", response_model=MoodleInspectResponse)
async def inspect_moodle_compatibility(url: str):
    """
    Test any arbitrary university LMS URL to verify whether it runs Moodle
    and determine compatibility with this connector.
    """
    target = url.strip().rstrip("/")
    if not target.startswith("http://") and not target.startswith("https://"):
        target = "https://" + target

    start = time.time()
    is_moodle = False
    engine = "Unknown / Non-Moodle"
    status_code = None
    has_moodle_cookie = False
    has_login_php = False
    has_token_service = False
    has_rest_ws = False

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, verify=False) as client:
            # 1. Inspect Root Page
            res = await client.get(target)
            status_code = res.status_code
            cookies_str = str(res.headers.get("set-cookie", "")).lower()
            body_text = res.text.lower()

            if "moodlesession" in cookies_str or "moodle" in cookies_str:
                has_moodle_cookie = True
                is_moodle = True

            if "moodle" in body_text or "class=\"path-login\"" in body_text:
                is_moodle = True

            # Detect D-Learn specifically
            if "d-learn" in body_text or "d-learn" in target.lower():
                engine = "Proprietary D-Learn (e.g. Vasyl Stefanyk PNU)"

            # 2. Check /login/index.php
            try:
                res_login = await client.get(f"{target}/login/index.php")
                if res_login.status_code == 200 and ("moodle" in res_login.text.lower() or "login" in res_login.text.lower()):
                    has_login_php = True
                    is_moodle = True
            except Exception:
                pass

            # 3. Check /login/token.php
            try:
                res_token = await client.post(f"{target}/login/token.php", data={"service": "moodle_mobile_app"})
                if res_token.status_code == 200 and "error" in res_token.text:
                    has_token_service = True
                    is_moodle = True
            except Exception:
                pass

            # 4. Check /webservice/rest/server.php
            try:
                res_ws = await client.post(f"{target}/webservice/rest/server.php", data={"moodlewsrestformat": "json"})
                if res_ws.status_code == 200 and ("invalidtoken" in res_ws.text or "exception" in res_ws.text):
                    has_rest_ws = True
                    is_moodle = True
            except Exception:
                pass

    except Exception as exc:
        latency = round((time.time() - start) * 1000, 2)
        return MoodleInspectResponse(
            target_url=target,
            is_moodle=False,
            engine_detected=engine,
            latency_ms=latency,
            recommendation=f"Could not connect to URL ({exc}). Check internet or spelling.",
        )

    latency = round((time.time() - start) * 1000, 2)
    if is_moodle:
        engine = "Moodle LMS"
        rec = "✅ Valid Moodle detected! Fully compatible with Browser Cookie and Token authentication."
    else:
        rec = f"❌ {engine} detected. This platform does not run Moodle and cannot use Moodle REST APIs."

    return MoodleInspectResponse(
        target_url=target,
        is_moodle=is_moodle,
        status_code=status_code,
        engine_detected=engine,
        has_moodle_session_cookie=has_moodle_cookie,
        has_login_php=has_login_php,
        has_token_service=has_token_service,
        has_rest_webservice=has_rest_ws,
        latency_ms=latency,
        recommendation=rec,
    )


@router.get("/parsing-restrictions")
async def get_system_parsing_restrictions():
    """Return the active Moodle parsing restrictions and anti-cheat configuration."""
    from app.core.parsing_restrictions import get_parsing_restrictions
    restrictions = get_parsing_restrictions()
    return restrictions.model_dump()

