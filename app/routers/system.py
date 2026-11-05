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
