from typing import Optional, List
from pydantic import BaseModel, Field


class GradeItem(BaseModel):
    id: Optional[int] = None
    itemname: Optional[str] = None
    itemtype: Optional[str] = None
    gradeformatted: Optional[str] = None
    grademin: Optional[float] = None
    grademax: Optional[float] = None
    percentageformatted: Optional[str] = None
    feedback: Optional[str] = None


class CourseGrades(BaseModel):
    course_id: int
    course_fullname: Optional[str] = None
    grade_items: List[GradeItem] = Field(default_factory=list)


class GradeOverviewResponse(BaseModel):
    courses: List[CourseGrades] = Field(default_factory=list)
