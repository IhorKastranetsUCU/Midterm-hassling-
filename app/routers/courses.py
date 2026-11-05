from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.exceptions import MoodleException
from app.core.security import get_current_user_session
from app.models.course import CourseSummary, CourseDetail, CourseSection, CourseModule
from app.services.moodle_client import MoodleClient

router = APIRouter(prefix="/api/courses", tags=["Courses"])


@router.get("", response_model=List[CourseSummary])
async def get_my_courses(session: Dict[str, Any] = Depends(get_current_user_session)):
    """
    Fetch all courses the currently logged-in user is enrolled in.
    """
    client = MoodleClient(base_url=session.get("site_url"))
    token = session["moodle_token"]
    user_id = session["user_id"]
    auth_type = session.get("auth_type", "token")
    sesskey = session.get("sesskey")

    try:
        raw_courses = await client.get_user_courses(
            token=token,
            user_id=user_id,
            auth_type=auth_type,
            sesskey=sesskey,
        )
    except MoodleException as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Moodle error fetching courses: {exc.message}",
        )

    courses = []
    for c in raw_courses:
        courses.append(
            CourseSummary(
                id=c["id"],
                shortname=c.get("shortname", ""),
                fullname=c.get("fullname", ""),
                summary=c.get("summary", ""),
                enrolledusercount=c.get("enrolledusercount"),
                progress=c.get("progress"),
                completed=c.get("completed"),
                startdate=c.get("startdate"),
                enddate=c.get("enddate"),
            )
        )
    return courses


@router.get("/{course_id}", response_model=CourseSummary)
async def get_course_detail(
    course_id: int,
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    """
    Fetch summary metadata for a specific course by ID.
    """
    client = MoodleClient(base_url=session.get("site_url"))
    token = session["moodle_token"]
    user_id = session["user_id"]
    auth_type = session.get("auth_type", "token")
    sesskey = session.get("sesskey")

    try:
        raw_courses = await client.get_user_courses(
            token=token,
            user_id=user_id,
            auth_type=auth_type,
            sesskey=sesskey,
        )
    except MoodleException as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Moodle error fetching course: {exc.message}",
        )

    for c in raw_courses:
        if c["id"] == course_id:
            return CourseSummary(
                id=c["id"],
                shortname=c.get("shortname", ""),
                fullname=c.get("fullname", ""),
                summary=c.get("summary", ""),
                enrolledusercount=c.get("enrolledusercount"),
                progress=c.get("progress"),
                completed=c.get("completed"),
                startdate=c.get("startdate"),
                enddate=c.get("enddate"),
            )

    raise HTTPException(status_code=404, detail=f"Course with ID {course_id} not found in user enrollments.")


@router.get("/{course_id}/contents", response_model=List[CourseSection])
async def get_course_contents(
    course_id: int,
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    """
    Fetch syllabus, sections, and modules (resources, assignments, quizzes) for a given course.
    """
    client = MoodleClient(base_url=session.get("site_url"))
    token = session["moodle_token"]
    auth_type = session.get("auth_type", "token")
    sesskey = session.get("sesskey")

    try:
        raw_sections = await client.get_course_contents(
            token=token,
            course_id=course_id,
            auth_type=auth_type,
            sesskey=sesskey,
        )
    except MoodleException as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Moodle error fetching course contents: {exc.message}",
        )

    sections = []
    for s in raw_sections:
        modules = []
        for m in s.get("modules", []):
            modules.append(
                CourseModule(
                    id=m["id"],
                    name=m.get("name", "Unnamed Item"),
                    modname=m.get("modname", "unknown"),
                    instance=m.get("instance"),
                    url=m.get("url"),
                    description=m.get("description"),
                    visible=m.get("visible", 1),
                )
            )
        sections.append(
            CourseSection(
                id=s["id"],
                name=s.get("name", "General"),
                summary=s.get("summary"),
                modules=modules,
            )
        )
    return sections
