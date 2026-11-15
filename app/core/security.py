from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from urllib.parse import urlparse
import uuid
import jwt
from fastapi import Request, Response, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import get_settings, Settings
from app.core.exceptions import UnauthorizedError

security_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class WorkspaceOwner:
    """Resolved tenant/user identity that owns private courses, snapshots, and mixes."""

    owner_id: str
    auth_mode: str  # "moodle" | "workspace_token" | "workspace_cookie" | "new_guest"
    moodle_user_id: Optional[int] = None


def build_moodle_owner_id(site_url: Optional[str], user_id: Any) -> str:
    """Build deterministic owner key from Moodle site host + numeric Moodle user_id."""
    parsed = urlparse((site_url or "").strip())
    host = (parsed.netloc or parsed.path or "moodle").split("/")[0].lower().strip() or "moodle"
    return f"moodle:{host}:{user_id}"


def create_workspace_jwt(owner_id: str, settings: Optional[Settings] = None) -> str:
    """Sign an isolated workspace identity token (contains zero Moodle secrets)."""
    if settings is None:
        settings = get_settings()

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.WORKSPACE_TOKEN_EXPIRE_MINUTES)
    payload = {
        "workspace_owner_id": owner_id,
        "token_type": "workspace",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_workspace_jwt(token: str, settings: Optional[Settings] = None) -> Optional[str]:
    """Verify a signed workspace JWT and return owner_id if valid."""
    if not token:
        return None
    try:
        payload = decode_session_jwt(token, settings)
    except UnauthorizedError:
        return None

    owner_id = payload.get("workspace_owner_id")
    if (
        payload.get("token_type") == "workspace"
        and isinstance(owner_id, str)
        and owner_id.startswith(("ws:", "moodle:"))
    ):
        return owner_id
    return None


def _extract_bearer_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    return None


def resolve_workspace_owner(
    request: Request,
    response: Optional[Response] = None,
    auto_issue: bool = True,
    ignore_workspace_header: bool = False,
) -> WorkspaceOwner:
    """
    Resolve the isolated workspace owner for this request.
    Precedence: active Moodle JWT > explicit X-Workspace-Token > workspace_session cookie > new guest cookie.
    """
    settings = get_settings()
    bearer_token = _extract_bearer_token(request)

    # 1. Active Moodle session always wins so switching accounts switches workspaces immediately.
    moodle_jwt = request.cookies.get(settings.COOKIE_NAME) or bearer_token
    if moodle_jwt:
        try:
            session = decode_session_jwt(moodle_jwt, settings)
            if "moodle_token" in session and session.get("user_id") is not None:
                uid = int(session["user_id"])
                return WorkspaceOwner(
                    owner_id=build_moodle_owner_id(session.get("site_url"), uid),
                    auth_mode="moodle",
                    moodle_user_id=uid,
                )
        except (UnauthorizedError, ValueError, TypeError):
            pass

        ws_from_bearer = decode_workspace_jwt(moodle_jwt, settings)
        if ws_from_bearer:
            return WorkspaceOwner(owner_id=ws_from_bearer, auth_mode="workspace_token")

    # 2. Explicit X-Workspace-Token header (used by Chrome Extension / API clients).
    if not ignore_workspace_header:
        header_token = request.headers.get("X-Workspace-Token", "").strip()
        ws_from_header = decode_workspace_jwt(header_token, settings)
        if ws_from_header:
            return WorkspaceOwner(owner_id=ws_from_header, auth_mode="workspace_token")

    # 3. Persistent standalone browser workspace cookie.
    ws_cookie = request.cookies.get(settings.WORKSPACE_COOKIE_NAME, "").strip()
    ws_from_cookie = decode_workspace_jwt(ws_cookie, settings)
    if ws_from_cookie:
        return WorkspaceOwner(owner_id=ws_from_cookie, auth_mode="workspace_cookie")

    if not auto_issue:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Workspace identity required.",
        )

    # 4. Mint a fresh isolated guest workspace identity cookie.
    new_owner_id = f"ws:{uuid.uuid4().hex}"
    new_jwt = create_workspace_jwt(new_owner_id, settings)
    if response is not None:
        response.set_cookie(
            key=settings.WORKSPACE_COOKIE_NAME,
            value=new_jwt,
            max_age=settings.WORKSPACE_TOKEN_EXPIRE_MINUTES * 60,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path="/",
        )
    return WorkspaceOwner(owner_id=new_owner_id, auth_mode="new_guest")


async def get_workspace_owner(request: Request, response: Response) -> WorkspaceOwner:
    """FastAPI dependency returning the isolated owner for workspace/extension routes."""
    return resolve_workspace_owner(request, response=response, auto_issue=True)


async def get_workspace_session_owner(request: Request, response: Response) -> WorkspaceOwner:
    """Session bootstrap dependency preferring browser cookies over any cached extension header."""
    return resolve_workspace_owner(
        request,
        response=response,
        auto_issue=True,
        ignore_workspace_header=True,
    )


def create_session_jwt(payload_data: Dict[str, Any], settings: Optional[Settings] = None) -> str:
    """Generate a signed JWT token containing the user's Moodle session data."""
    if settings is None:
        settings = get_settings()

    to_encode = payload_data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_session_jwt(token: str, settings: Optional[Settings] = None) -> Dict[str, Any]:
    """Verify and decode a JWT session token."""
    if settings is None:
        settings = get_settings()

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Session has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise UnauthorizedError("Invalid session token.")


async def get_current_user_session(
    request: Request,
    bearer_auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> Dict[str, Any]:
    """
    Extract and validate session JWT from HttpOnly Cookie OR Authorization header.
    Returns the decoded session payload containing:
    {
        "sub": username,
        "moodle_token": token,
        "user_id": int,
        "fullname": str,
        "site_url": str
    }
    """
    settings = get_settings()
    token = None

    # 1. Try secure cookie first
    if settings.COOKIE_NAME in request.cookies:
        token = request.cookies.get(settings.COOKIE_NAME)
    
    # 2. Try Authorization Bearer header fallback
    elif bearer_auth and bearer_auth.credentials:
        token = bearer_auth.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in with your Moodle account.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        session = decode_session_jwt(token, settings)
        if "moodle_token" not in session:
            raise UnauthorizedError("Session does not contain a valid Moodle token.")
        return session
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
