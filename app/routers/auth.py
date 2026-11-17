import hashlib
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse, RedirectResponse
from app.config import get_settings
from app.core.events import AcademicEvent, event_bus
from app.core.exceptions import MoodleAuthError, MoodleConnectionError, MoodleAPIError, UnauthorizedError
from app.core.security import (
    build_google_owner_id,
    build_moodle_owner_id,
    create_platform_jwt,
    create_session_jwt,
    decode_session_jwt,
    get_current_user_session,
    get_optional_platform_session,
    resolve_workspace_owner,
    validate_moodle_target_url,
)
from app.models.auth import (
    DevGoogleLoginRequest,
    ExtensionPairRequest,
    LoginRequest,
    LoginResponse,
    PlatformAccountStatus,
    UserProfile,
)
from app.services.moodle_client import MoodleClient
from app.services.workspace_store import get_workspace_store

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(login_req: LoginRequest, response: Response, request: Request):
    """
    Authenticate individual user against UCU Moodle (or specified Moodle instance).
    Issues an encrypted, secure HttpOnly cookie containing the user's Moodle session.
    """
    settings = get_settings()
    validated_url = (
        validate_moodle_target_url(login_req.moodle_url, require_known_host=False)
        if login_req.moodle_url and not settings.MOODLE_MOCK_MODE
        else (login_req.moodle_url or settings.MOODLE_BASE_URL)
    )
    client = MoodleClient(base_url=validated_url)

    try:
        if login_req.cookie and login_req.cookie.strip():
            auth_result = await client.authenticate_with_cookie(
                cookie_input=login_req.cookie.strip(),
                target_moodle_url=login_req.moodle_url,
            )
        elif login_req.token and login_req.token.strip():
            auth_result = await client.authenticate_with_token(
                token=login_req.token.strip(),
                target_moodle_url=login_req.moodle_url,
            )
        else:
            auth_result = await client.authenticate_user(
                username=login_req.username,
                password=login_req.password,
                target_moodle_url=login_req.moodle_url,
            )
    except MoodleAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.message or "Invalid credentials or session.",
        )
    except MoodleConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=exc.message or "Cannot connect to Moodle server.",
        )
    except MoodleAPIError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=exc.message or "Moodle API error occurred.",
        )

    user_info = auth_result["user"]
    moodle_token = auth_result["token"]
    platform_claims = get_optional_platform_session(request, settings)

    # Build signed JWT payload (preserving Google owner_id if already signed in)
    session_payload = {
        "sub": user_info["username"],
        "user_id": user_info["user_id"],
        "fullname": user_info["fullname"],
        "userpictureurl": user_info.get("userpictureurl"),
        "site_name": user_info.get("site_name"),
        "site_url": user_info.get("site_url"),
        "moodle_token": moodle_token,
        "auth_type": auth_result.get("auth_type", "token"),
        "sesskey": auth_result.get("sesskey"),
    }
    if platform_claims:
        session_payload["owner_id"] = platform_claims["owner_id"]
        get_workspace_store().link_moodle_account(
            owner_id=platform_claims["owner_id"],
            moodle_url=user_info.get("site_url") or client.base_url,
            moodle_user_id=user_info["user_id"],
            moodle_username=user_info["username"],
        )

    jwt_token = create_session_jwt(session_payload, settings)

    # Set secure HttpOnly cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=jwt_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )

    user_profile = UserProfile(
        user_id=user_info["user_id"],
        username=user_info["username"],
        fullname=user_info["fullname"],
        userpictureurl=user_info.get("userpictureurl"),
        site_name=user_info.get("site_name"),
        site_url=user_info.get("site_url"),
        role=user_info.get("role", "student"),
    )

    return LoginResponse(
        success=True,
        message="Successfully authenticated with Moodle.",
        user=user_profile,
        token=jwt_token,
    )


@router.post("/logout")
async def logout(response: Response):
    """Log out user by clearing Moodle and Google platform session cookies."""
    settings = get_settings()
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/",
        samesite=settings.COOKIE_SAMESITE,
    )
    response.delete_cookie(
        key=settings.PLATFORM_COOKIE_NAME,
        path="/",
        samesite=settings.COOKIE_SAMESITE,
    )
    return {"success": True, "message": "Logged out successfully."}


@router.get("/me", response_model=UserProfile)
async def get_current_user(session: Dict[str, Any] = Depends(get_current_user_session)):
    """Retrieve the currently authenticated user's profile."""
    return UserProfile(
        user_id=session["user_id"],
        username=session["sub"],
        fullname=session.get("fullname", session["sub"]),
        userpictureurl=session.get("userpictureurl"),
        site_name=session.get("site_name"),
        site_url=session.get("site_url"),
        role="student",
    )


def _issue_platform_session_cookie(
    response: Response,
    google_sub: str,
    email: str,
    fullname: str,
    picture_url: Optional[str] = None,
    request: Optional[Request] = None,
) -> Dict[str, Any]:
    settings = get_settings()
    owner_id = build_google_owner_id(google_sub)
    # Prevent stale/other-user Moodle session cookies from lingering on account switch
    if request is not None:
        raw_moodle_jwt = request.cookies.get(settings.COOKIE_NAME)
        if raw_moodle_jwt:
            try:
                old_moodle = decode_session_jwt(raw_moodle_jwt, settings)
                if old_moodle.get("owner_id") != owner_id:
                    response.delete_cookie(key=settings.COOKIE_NAME, path="/", samesite=settings.COOKIE_SAMESITE)
            except UnauthorizedError:
                response.delete_cookie(key=settings.COOKIE_NAME, path="/", samesite=settings.COOKIE_SAMESITE)

    user_row = get_workspace_store().upsert_google_user(
        owner_id=owner_id,
        google_sub=google_sub,
        email=email,
        fullname=fullname,
        picture_url=picture_url,
    )
    platform_jwt = create_platform_jwt(
        owner_id=owner_id,
        google_sub=google_sub,
        email=email,
        fullname=fullname,
        picture_url=picture_url,
        settings=settings,
    )
    response.set_cookie(
        key=settings.PLATFORM_COOKIE_NAME,
        value=platform_jwt,
        max_age=settings.WORKSPACE_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )
    return {"owner_id": owner_id, "platform_token": platform_jwt, "user": user_row}


@router.get("/google/login")
async def google_oauth_login(
    redirect: bool = Query(default=True),
):
    """Start Google OAuth2 sign-in flow so platform accounts never require passwords."""
    settings = get_settings()
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or use POST /api/auth/google/dev-login in dev).",
        )

    state_nonce = secrets.token_urlsafe(24)
    state_jwt = create_session_jwt({"token_type": "oauth_state", "oauth_state": state_nonce}, settings)
    params = urlencode(
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state_nonce,
            "access_type": "online",
            "prompt": "select_account",
        }
    )
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{params}"

    if not redirect:
        res_obj = JSONResponse({"auth_url": auth_url})
        res_obj.set_cookie(
            key="google_oauth_state",
            value=state_jwt,
            max_age=600,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite="lax",
            path="/",
        )
        return res_obj

    redir = RedirectResponse(url=auth_url, status_code=status.HTTP_302_FOUND)
    redir.set_cookie(
        key="google_oauth_state",
        value=state_jwt,
        max_age=600,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return redir


@router.get("/google/callback")
async def google_oauth_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    format: str = Query(default="redirect"),
):
    """Handle Google OAuth2 callback, create/update platform user, and set HttpOnly platform_session."""
    settings = get_settings()
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured.")

    state_cookie = request.cookies.get("google_oauth_state", "")
    try:
        decoded_state = decode_session_jwt(state_cookie, settings)
    except UnauthorizedError:
        raise HTTPException(status_code=400, detail="Missing or expired OAuth state cookie.")

    expected_state = decoded_state.get("oauth_state")
    if (
        decoded_state.get("token_type") != "oauth_state"
        or not isinstance(expected_state, str)
        or not expected_state
        or not state
        or not secrets.compare_digest(expected_state, state)
    ):
        raise HTTPException(status_code=400, detail="Invalid Google OAuth state.")

    async with httpx.AsyncClient(timeout=15.0) as client:
        tok_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if tok_res.status_code != 200:
            raise HTTPException(status_code=401, detail="Google token exchange failed.")
        access_token = tok_res.json().get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail="Google did not return an access_token.")

        info_res = await client.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if info_res.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to fetch Google profile.")
        profile = info_res.json()

    google_sub = str(profile.get("sub") or "").strip()
    email = str(profile.get("email") or "").strip()
    fullname = str(profile.get("name") or email or "Student").strip()
    picture_url = profile.get("picture")
    if not google_sub or not email:
        raise HTTPException(status_code=400, detail="Incomplete Google OpenID profile.")

    if format == "json":
        res = Response()
        issued = _issue_platform_session_cookie(res, google_sub, email, fullname, picture_url, request=request)
        res.delete_cookie("google_oauth_state", path="/")
        import json as _json
        res.body = _json.dumps({"success": True, **issued}).encode("utf-8")
        res.media_type = "application/json"
        res.headers["content-length"] = str(len(res.body))
        return res

    redir = RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
    _issue_platform_session_cookie(redir, google_sub, email, fullname, picture_url, request=request)
    redir.delete_cookie("google_oauth_state", path="/")
    return redir


@router.post("/google/dev-login")
async def google_dev_login(req: DevGoogleLoginRequest, request: Request, response: Response):
    """Local dev/sandbox Google sign-in helper when GOOGLE_CLIENT_ID is not yet configured."""
    settings = get_settings()
    if not settings.AUTH_DEV_GOOGLE_ENABLED or settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev Google login is disabled unless AUTH_DEV_GOOGLE_ENABLED=true without real OAuth credentials.",
        )

    clean_email = req.email.strip().lower()
    sub = hashlib.sha256(clean_email.encode("utf-8")).hexdigest()[:20]
    fullname = (req.fullname or "").strip() or clean_email.split("@")[0]
    issued = _issue_platform_session_cookie(response, sub, clean_email, fullname, picture_url=None, request=request)
    return {
        "success": True,
        "message": "Signed in with dev Google profile.",
        **issued,
    }


@router.post("/extension-pair")
async def extension_pair_moodle_cookie(
    req: ExtensionPairRequest,
    request: Request,
    response: Response,
) -> Dict[str, Any]:
    """
    Receive MoodleSession cookie from the Chrome extension, verify it live against Moodle,
    pair it to the signed-in Google account (if present), and store it ONLY inside an HttpOnly JWT cookie.
    Zero Moodle passwords or raw cookies are persisted to the database.
    """
    settings = get_settings()
    target_url = validate_moodle_target_url(
        req.moodle_url or settings.MOODLE_BASE_URL,
        require_known_host=True,
    )
    client = MoodleClient(base_url=target_url)

    try:
        auth_result = await client.authenticate_with_cookie(
            cookie_input=req.cookie.strip(),
            target_moodle_url=target_url,
        )
    except MoodleAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.message or "MoodleSession cookie is invalid or expired.",
        )
    except MoodleConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=exc.message or "Could not reach target Moodle server.",
        )

    user_info = auth_result["user"]
    moodle_site = (user_info.get("site_url") or target_url).rstrip("/")
    platform_claims = get_optional_platform_session(request, settings)

    session_payload: Dict[str, Any] = {
        "sub": user_info["username"],
        "user_id": user_info["user_id"],
        "fullname": user_info["fullname"],
        "userpictureurl": user_info.get("userpictureurl"),
        "site_name": user_info.get("site_name"),
        "site_url": moodle_site,
        "moodle_token": auth_result["token"],
        "auth_type": "cookie",
        "sesskey": auth_result.get("sesskey"),
    }

    if platform_claims:
        owner_id = platform_claims["owner_id"]
        session_payload["owner_id"] = owner_id
        get_workspace_store().link_moodle_account(
            owner_id=owner_id,
            moodle_url=moodle_site,
            moodle_user_id=user_info["user_id"],
            moodle_username=user_info["username"],
        )
    else:
        raw_uid = user_info.get("user_id") or 0
        uid_key = raw_uid if int(raw_uid) > 0 else hashlib.sha256(
            f"{moodle_site}:{user_info.get('username', '')}".encode("utf-8")
        ).hexdigest()[:12]
        owner_id = build_moodle_owner_id(moodle_site, uid_key)

    moodle_jwt = create_session_jwt(session_payload, settings)
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=moodle_jwt,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )

    await event_bus.publish(
        AcademicEvent(
            type="workspace.moodle_paired",
            title="Moodle Session Paired",
            message=f"Connected {moodle_site} ({user_info['username']}) without storing credentials.",
            severity="success",
            owner_id=owner_id,
            data={"moodle_url": moodle_site, "moodle_user_id": user_info["user_id"]},
        )
    )

    return {
        "success": True,
        "owner_id": owner_id,
        "google_linked": bool(platform_claims),
        "moodle_paired": True,
        "moodle_url": moodle_site,
        "moodle_user_id": user_info["user_id"],
        "moodle_username": user_info["username"],
        "paired_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/status", response_model=PlatformAccountStatus)
async def get_auth_status(request: Request, response: Response):
    """Return resolved workspace owner, Google account link status, and live Moodle pairing status."""
    settings = get_settings()
    owner = resolve_workspace_owner(request, response=response, auto_issue=True)
    platform_claims = get_optional_platform_session(request, settings)
    store = get_workspace_store()
    user_row = store.get_platform_user(owner.owner_id) if owner.owner_id.startswith("google:") else None

    moodle_session: Optional[Dict[str, Any]] = None
    raw_moodle_jwt = request.cookies.get(settings.COOKIE_NAME)
    if raw_moodle_jwt:
        try:
            decoded_moodle = decode_session_jwt(raw_moodle_jwt, settings)
            if not platform_claims or decoded_moodle.get("owner_id") == owner.owner_id:
                moodle_session = decoded_moodle
        except UnauthorizedError:
            moodle_session = None

    return PlatformAccountStatus(
        owner_id=owner.owner_id,
        auth_mode=owner.auth_mode,
        google_linked=bool(platform_claims or user_row),
        email=(platform_claims or {}).get("email") or (user_row or {}).get("email"),
        fullname=(platform_claims or {}).get("fullname") or (user_row or {}).get("fullname"),
        picture_url=(platform_claims or {}).get("picture_url") or (user_row or {}).get("picture_url"),
        moodle_paired=bool(moodle_session and moodle_session.get("moodle_token")),
        moodle_url=(moodle_session or {}).get("site_url") or (user_row or {}).get("linked_moodle_url"),
        moodle_user_id=(moodle_session or {}).get("user_id") or (user_row or {}).get("linked_moodle_user_id"),
        moodle_username=(moodle_session or {}).get("sub") or (user_row or {}).get("linked_moodle_username"),
    )
