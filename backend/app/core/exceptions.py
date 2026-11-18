from typing import Optional, Any, Dict


class MoodleException(Exception):
    """Base exception for Moodle connector errors"""
    def __init__(self, message: str, error_code: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}


class MoodleAuthError(MoodleException):
    """Raised when authentication fails (bad username/password or invalid token)"""
    pass


class MoodleAPIError(MoodleException):
    """Raised when Moodle REST server returns an API exception"""
    pass


class MoodleConnectionError(MoodleException):
    """Raised when Moodle host cannot be reached"""
    pass


class UnauthorizedError(Exception):
    """Raised when request lacks valid session/JWT"""
    def __init__(self, detail: str = "Not authenticated"):
        self.detail = detail
        super().__init__(detail)
