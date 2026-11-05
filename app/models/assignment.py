from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class AssignmentItem(BaseModel):
    id: int
    cmid: Optional[int] = None
    course_id: int
    course_name: Optional[str] = None
    name: str
    duedate: Optional[int] = None
    duedate_formatted: Optional[str] = None
    intro: Optional[str] = None
    nosubmissions: Optional[int] = 0
    submissions_open: Optional[bool] = True
    is_overdue: Optional[bool] = False


class AssignmentListResponse(BaseModel):
    total: int
    assignments: List[AssignmentItem] = Field(default_factory=list)
