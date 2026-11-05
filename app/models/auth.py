from typing import Optional
from pydantic import BaseModel, Field, model_validator


class LoginRequest(BaseModel):
    # Support: MoodleSession Cookie OR Security Token OR Username+Password
    cookie: Optional[str] = Field(None, description="MoodleSession browser cookie (from learn.ucu.edu.ua)")
    token: Optional[str] = Field(None, description="Moodle Web Service Security Key (Token)")
    username: Optional[str] = Field(None, description="Moodle account username")
    password: Optional[str] = Field(None, description="Moodle account password")
    moodle_url: Optional[str] = Field(None, description="Optional override for target Moodle URL")

    @model_validator(mode="after")
    def validate_auth_method(self):
        if not self.cookie and not self.token and not (self.username and self.password):
            raise ValueError("Please provide either a MoodleSession Cookie, Security Token, or Username and Password.")
        return self


class UserProfile(BaseModel):
    user_id: int
    username: str
    fullname: str
    userpictureurl: Optional[str] = None
    site_name: Optional[str] = None
    site_url: Optional[str] = None
    role: Optional[str] = None


class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserProfile] = None
    token: Optional[str] = None


class HealthCheckResponse(BaseModel):
    status: str
    moodle_url: str
    mock_mode: bool
    version: str = "1.0.0"
