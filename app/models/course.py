from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class CourseModule(BaseModel):
    id: int
    name: str
    modname: str  # e.g., 'assign', 'quiz', 'forum', 'resource', 'folder'
    instance: Optional[int] = None
    url: Optional[str] = None
    description: Optional[str] = None
    visible: Optional[int] = 1


class CourseSection(BaseModel):
    id: int
    name: str
    summary: Optional[str] = None
    modules: List[CourseModule] = Field(default_factory=list)


class CourseSummary(BaseModel):
    id: int
    shortname: str
    fullname: str
    summary: Optional[str] = None
    enrolledusercount: Optional[int] = None
    progress: Optional[float] = None
    completed: Optional[bool] = None
    startdate: Optional[int] = None
    enddate: Optional[int] = None


class CourseDetail(BaseModel):
    id: int
    fullname: str
    shortname: str
    summary: Optional[str] = None
    sections: List[CourseSection] = Field(default_factory=list)
