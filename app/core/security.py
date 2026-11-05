from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import get_settings, Settings
from app.core.exceptions import UnauthorizedError

security_bearer = HTTPBearer(auto_error=False)


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
