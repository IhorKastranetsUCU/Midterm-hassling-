from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Response, status
from app.config import get_settings
from app.core.exceptions import MoodleAuthError, MoodleConnectionError, MoodleAPIError
from app.core.security import create_session_jwt, get_current_user_session
from app.models.auth import LoginRequest, LoginResponse, UserProfile
from app.services.moodle_client import MoodleClient

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(login_req: LoginRequest, response: Response):
    """
    Authenticate individual user against UCU Moodle (or specified Moodle instance).
    Issues an encrypted, secure HttpOnly cookie containing the user's Moodle session.
    """
    settings = get_settings()
    client = MoodleClient(base_url=login_req.moodle_url or settings.MOODLE_BASE_URL)

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

    # Build signed JWT payload
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
    """Log out user by clearing the session cookie."""
    settings = get_settings()
    response.delete_cookie(
        key=settings.COOKIE_NAME,
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
