import os
from typing import List, Dict, Any, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import FileResponse, StreamingResponse

from app.core.parsing_restrictions import get_parsing_restrictions
from app.core.exceptions import MoodleException
from app.core.security import get_current_user_session
from app.models.course import (
    CourseSummary,
    CourseDetail,
    CourseSection,
    CourseModule,
    CourseFile,
    CourseFilesSummary,
)
from app.services.moodle_client import MoodleClient

router = APIRouter(prefix="/api/courses", tags=["Courses"])


@router.get("", response_model=List[CourseSummary])
async def get_my_courses(session: Dict[str, Any] = Depends(get_current_user_session)):
    """
    Fetch all courses the currently logged-in user is enrolled in.
    Supports token, cookie, and resilient dashboard scraping.
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
            base_url=session.get("site_url"),
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
            base_url=session.get("site_url"),
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
    Fetch syllabus, sections, and modules (resources, assignments, quizzes, and files) for a given course.
    Falls back to parsing course HTML if university restricts WebServices.
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
            base_url=session.get("site_url"),
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
            files_data = []
            for f in m.get("files", []):
                files_data.append(
                    CourseFile(
                        filename=f.get("filename", "file.pdf"),
                        fileurl=f.get("fileurl"),
                        filesize=f.get("filesize"),
                        mimetype=f.get("mimetype"),
                        timemodified=f.get("timemodified"),
                        is_safe=f.get("is_safe", True),
                        safety_reason=f.get("safety_reason"),
                    )
                )

            modules.append(
                CourseModule(
                    id=m["id"],
                    name=m.get("name", "Unnamed Item"),
                    modname=m.get("modname", "unknown"),
                    instance=m.get("instance"),
                    url=m.get("url"),
                    description=m.get("description"),
                    visible=m.get("visible", 1),
                    contents=m.get("contents", []),
                    files=files_data,
                    download_url=m.get("download_url"),
                    safety_status=m.get("safety_status", "safe_material"),
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


@router.get("/{course_id}/files", response_model=CourseFilesSummary)
async def list_course_files(
    course_id: int,
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    """
    List all downloadable files discovered in the course, along with safety status and size metadata.
    """
    client = MoodleClient(base_url=session.get("site_url"))
    token = session["moodle_token"]
    auth_type = session.get("auth_type", "token")
    sesskey = session.get("sesskey")

    raw_sections = await client.get_course_contents(
        token=token,
        course_id=course_id,
        auth_type=auth_type,
        sesskey=sesskey,
        base_url=session.get("site_url"),
    )

    restrictions = get_parsing_restrictions()
    all_files = []
    safe_count = 0
    restricted_count = 0

    for s in raw_sections:
        sec_name = s.get("name", "General")
        for m in s.get("modules", []):
            mod_id = m.get("id")
            mod_name = m.get("name")
            mod_type = m.get("modname")

            m_safe, m_reason = restrictions.is_module_safe(mod_name, mod_type, m.get("url"))

            file_items = m.get("files", [])
            if not file_items and m.get("download_url"):
                file_items = [{"filename": f"{mod_name}.pdf", "fileurl": m["download_url"]}]

            for f in file_items:
                fname = f.get("filename") or f"{mod_name}.pdf"
                furl = f.get("fileurl") or m.get("download_url")
                fsize = f.get("filesize")
                f_safe, f_reason = restrictions.is_file_safe(fname, furl, fsize)
                is_allowed = m_safe and f_safe

                if is_allowed:
                    safe_count += 1
                else:
                    restricted_count += 1

                all_files.append({
                    "module_id": mod_id,
                    "module_name": mod_name,
                    "section_name": sec_name,
                    "filename": fname,
                    "file_url": furl,
                    "file_size": fsize,
                    "is_safe": is_allowed,
                    "restriction_reason": None if is_allowed else (m_reason if not m_safe else f_reason),
                    "download_api": f"/api/courses/{course_id}/files/download/{mod_id}",
                })

    return CourseFilesSummary(
        course_id=course_id,
        total_files=len(all_files),
        safe_files=safe_count,
        restricted_files=restricted_count,
        files=all_files,
    )


@router.post("/{course_id}/files/pull-all")
async def pull_all_course_files(
    course_id: int,
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    """
    Pulls and caches all accessible, safe course files (PDFs, presentations, notes) locally.
    Enforces parsing restrictions and file size quotas.
    """
    client = MoodleClient(base_url=session.get("site_url"))
    token = session["moodle_token"]
    auth_type = session.get("auth_type", "token")
    sesskey = session.get("sesskey")

    result = await client.pull_all_course_files(
        token=token,
        course_id=course_id,
        auth_type=auth_type,
        sesskey=sesskey,
        base_url=session.get("site_url"),
    )
    return result


@router.get("/{course_id}/files/download/{module_id}")
async def download_module_file(
    course_id: int,
    module_id: int,
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    """
    Stream or download an individual course file directly from Moodle using the user's session credentials.
    """
    client = MoodleClient(base_url=session.get("site_url"))
    token = session["moodle_token"]
    auth_type = session.get("auth_type", "token")
    sesskey = session.get("sesskey")
    site_url = (session.get("site_url") or client.base_url).rstrip("/")

    # Check if file was already downloaded locally
    local_dir = os.path.join("data", "courses", str(course_id), "files")
    if os.path.exists(local_dir):
        for fname in os.listdir(local_dir):
            if fname.startswith(f"{module_id}_"):
                return FileResponse(os.path.join(local_dir, fname), filename=fname.split("_", 1)[-1])

    # Otherwise stream directly from Moodle
    target_url = f"{site_url}/mod/resource/view.php?id={module_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    }
    if auth_type == "cookie":
        headers["Cookie"] = f"MoodleSession={token}"
    elif auth_type == "token":
        target_url = f"{target_url}&wstoken={token}"

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers=headers) as http_client:
            resp = await http_client.get(target_url)
            if resp.status_code == 200:
                c_disp = resp.headers.get("content-disposition", f"attachment; filename=module_{module_id}.pdf")
                c_type = resp.headers.get("content-type", "application/octet-stream")
                return Response(content=resp.content, media_type=c_type, headers={"Content-Disposition": c_disp})
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch file from Moodle")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error streaming file: {str(exc)}")
