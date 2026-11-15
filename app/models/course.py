from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class CourseFile(BaseModel):
    filename: str
    fileurl: Optional[str] = None
    filesize: Optional[int] = None
    mimetype: Optional[str] = None
    timemodified: Optional[int] = None
    is_safe: bool = True
    safety_reason: Optional[str] = None


class CourseModule(BaseModel):
    id: int
    name: str
    modname: str  # e.g., 'assign', 'quiz', 'forum', 'resource', 'folder', 'page'
    instance: Optional[int] = None
    url: Optional[str] = None
    description: Optional[str] = None
    visible: Optional[int] = 1
    contents: List[Dict[str, Any]] = Field(default_factory=list)
    files: List[CourseFile] = Field(default_factory=list)
    download_url: Optional[str] = None
    safety_status: str = "safe_material"


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


class CourseFilesSummary(BaseModel):
    course_id: int
    total_files: int = 0
    safe_files: int = 0
    restricted_files: int = 0
    files: List[Dict[str, Any]] = Field(default_factory=list)
