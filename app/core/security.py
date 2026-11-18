from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import ipaddress
import re
from typing import Optional, Dict, Any
from urllib.parse import urlparse
import uuid
import jwt
from fastapi import Request, Response, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import get_settings, Settings
from app.core.authorities import AUTHORITIES_REGISTRY
from app.core.exceptions import UnauthorizedError

security_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class WorkspaceOwner:
    """Resolved tenant/user identity that owns private courses, snapshots, and mixes."""

    owner_id: str
    auth_mode: str  # "google+moodle" | "google" | "moodle" | "workspace_token" | "workspace_cookie" | "new_guest"
    moodle_user_id: Optional[int] = None


def build_moodle_owner_id(site_url: Optional[str], user_id: Any) -> str:
    """Build deterministic owner key from Moodle site host + numeric Moodle user_id."""
    parsed = urlparse((site_url or "").strip())
    host = (parsed.netloc or parsed.path or "moodle").split("/")[0].lower().strip() or "moodle"
    return f"moodle:{host}:{user_id}"


def build_google_owner_id(google_sub: str) -> str:
    """Build deterministic owner key for a Google-authenticated platform user."""
    clean = re.sub(r"[^a-zA-Z0-9._-]", "", (google_sub or "").strip())
    if not clean:
        raise ValueError("Invalid Google subject identifier")
    return f"google:{clean}"


def owner_storage_slug(owner_id: str) -> str:
    """Return a fixed-length, path-traversal-proof directory/prefix slug unique to one person."""
    return hashlib.sha256((owner_id or "").encode("utf-8")).hexdigest()[:16]


def validate_moodle_target_url(raw_url: str, require_known_host: bool = False) -> str:
    """
    Validate a target Moodle base URL to prevent SSRF and MoodleSession exfiltration.
    Requires HTTPS, forbids userinfo/private/loopback/link-local hosts, and optionally enforces known LMS hosts.
    """
    clean = (raw_url or "").strip().rstrip("/")
    parsed = urlparse(clean)
    if parsed.scheme.lower() != "https" or not parsed.netloc or parsed.username or parsed.password or "@" in parsed.netloc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Moodle URL must be a valid https:// origin without credentials.",
        )

    host = (parsed.hostname or "").lower().strip()
    if not host or host == "localhost" or host.endswith((".local", ".internal", ".localhost")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Private or local Moodle hosts are not permitted.",
        )

    try:
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Private or reserved IP targets are not permitted.",
            )
    except ValueError:
        pass

    if require_known_host:
        settings = get_settings()
        allowed_hosts = {
            (urlparse(auth.base_url).hostname or "").lower()
            for auth in AUTHORITIES_REGISTRY.values()
        }
        default_host = (urlparse(settings.MOODLE_BASE_URL).hostname or "").lower()
        if default_host:
            allowed_hosts.add(default_host)
        if host not in allowed_hosts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported Moodle host for extension pairing: {host}",
            )

    return f"https://{parsed.netloc}"


def create_platform_jwt(
    owner_id: str,
    google_sub: str,
    email: str,
    fullname: str,
    picture_url: Optional[str] = None,
    settings: Optional[Settings] = None,
) -> str:
    """Sign an HttpOnly platform session JWT for Google-authenticated users."""
    if settings is None:
        settings = get_settings()

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.WORKSPACE_TOKEN_EXPIRE_MINUTES)
    payload = {
        "token_type": "platform",
        "owner_id": owner_id,
        "google_sub": google_sub,
        "email": email,
        "fullname": fullname,
        "picture_url": picture_url,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_platform_jwt(token: str, settings: Optional[Settings] = None) -> Optional[Dict[str, Any]]:
    """Verify a signed platform JWT and return its claims if valid."""
    if not token:
        return None
    try:
        payload = decode_session_jwt(token, settings)
    except UnauthorizedError:
        return None

    owner_id = payload.get("owner_id")
    if (
        payload.get("token_type") == "platform"
        and isinstance(owner_id, str)
        and owner_id.startswith("google:")
    ):
        return payload
    return None


def get_optional_platform_session(request: Request, settings: Optional[Settings] = None) -> Optional[Dict[str, Any]]:
    """Extract the signed Google platform session from cookie or Authorization Bearer header."""
    if settings is None:
        settings = get_settings()
    token = request.cookies.get(settings.PLATFORM_COOKIE_NAME)
    if token:
        claims = decode_platform_jwt(token, settings)
        if claims:
            return claims
    bearer = _extract_bearer_token(request)
    if bearer:
        return decode_platform_jwt(bearer, settings)
    return None


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
        and owner_id.startswith(("ws:", "moodle:", "google:"))
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
    Precedence:
      1. Active Google platform JWT (paired Moodle JWT must match its owner_id if present)
      2. Active Moodle JWT (when not shadowed by a different Google platform session)
      3. Bearer workspace JWT
      4. Explicit X-Workspace-Token header
      5. workspace_session cookie
      6. New isolated guest workspace cookie
    """
    settings = get_settings()
    bearer_token = _extract_bearer_token(request)
    platform_claims = get_optional_platform_session(request, settings)
    moodle_jwt = request.cookies.get(settings.COOKIE_NAME) or bearer_token

    moodle_session: Optional[Dict[str, Any]] = None
    if moodle_jwt:
        try:
            decoded = decode_session_jwt(moodle_jwt, settings)
            if "moodle_token" in decoded and decoded.get("user_id") is not None:
                moodle_session = decoded
        except (UnauthorizedError, ValueError, TypeError):
            moodle_session = None

    # 1. If a Google platform session is active, never let a stale/mismatched moodle_session hijack owner_id.
    if platform_claims:
        g_owner = platform_claims["owner_id"]
        if moodle_session and moodle_session.get("owner_id") == g_owner:
            return WorkspaceOwner(
                owner_id=g_owner,
                auth_mode="google+moodle",
                moodle_user_id=int(moodle_session["user_id"]),
            )
        return WorkspaceOwner(
            owner_id=g_owner,
            auth_mode="google",
            moodle_user_id=None,
        )

    # 2. Standalone Moodle session (cookie or Bearer)
    if moodle_session:
        uid = int(moodle_session["user_id"])
        explicit_owner = moodle_session.get("owner_id")
        if isinstance(explicit_owner, str) and explicit_owner.startswith("google:"):
            return WorkspaceOwner(
                owner_id=explicit_owner,
                auth_mode="google+moodle",
                moodle_user_id=uid,
            )
        return WorkspaceOwner(
            owner_id=build_moodle_owner_id(moodle_session.get("site_url"), uid),
            auth_mode="moodle",
            moodle_user_id=uid,
        )

    # 3. Bearer workspace JWT (checked independently of any expired moodle_session cookie)
    if bearer_token:
        ws_from_bearer = decode_workspace_jwt(bearer_token, settings)
        if ws_from_bearer:
            return WorkspaceOwner(owner_id=ws_from_bearer, auth_mode="workspace_token")

    # 4. Explicit X-Workspace-Token header (used by Chrome Extension / API clients).
    if not ignore_workspace_header:
        header_token = request.headers.get("X-Workspace-Token", "").strip()
        ws_from_header = decode_workspace_jwt(header_token, settings)
        if ws_from_header:
            return WorkspaceOwner(owner_id=ws_from_header, auth_mode="workspace_token")

    # 5. Persistent standalone browser workspace cookie.
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
        mock_session = payload.get("is_mock") or str(payload.get("moodle_token", "")).startswith("mock_")
        if mock_session and not settings.MOODLE_MOCK_MODE:
            raise UnauthorizedError("Підключи свій акаунт Moodle.")
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Session has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise UnauthorizedError("Invalid session token.")


def get_optional_moodle_session(request: Request, settings: Optional[Settings] = None) -> Optional[Dict[str, Any]]:
    """Extract authenticated Moodle session if present, returning None otherwise without raising 401."""
    if settings is None:
        settings = get_settings()
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
    if token:
        try:
            session = decode_session_jwt(token, settings)
            if "moodle_token" in session:
                return session
        except Exception:
            pass
    return None



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
