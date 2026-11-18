import os
import asyncio
import hashlib
import io
import zipfile
from pathlib import Path
from typing import List, Dict, Any, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, Response
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from app.config import get_settings
from urllib.parse import quote

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
from app.services.academic_cache import get_academic_cache
from app.services.moodle_client import MoodleClient

router = APIRouter(prefix="/api/courses", tags=["Courses"])


def _private_file_dir(session, course_id):
    identity = f"{session.get('site_url', '')}|{session.get('user_id', '')}"
    return os.path.join("data", "course_files", hashlib.sha256(identity.encode()).hexdigest(), str(course_id))


async def _get_cached_user_courses(session: Dict[str, Any], refresh: bool = False) -> List[Dict[str, Any]]:
    site_url = session.get("site_url")
    user_id = session["user_id"]
    cache = get_academic_cache()
    if not refresh:
        cached = cache.get(site_url, user_id, "courses")
        if cached is not None:
            return cached

    client = MoodleClient(base_url=site_url)
    raw_courses = await client.get_user_courses(
        token=session["moodle_token"],
        user_id=user_id,
        auth_type=session.get("auth_type", "token"),
        sesskey=session.get("sesskey"),
        base_url=site_url,
    )
    cache.set(site_url, user_id, "courses", raw_courses, ttl_seconds=300.0)
    return raw_courses


@router.get("", response_model=List[CourseSummary])
async def get_my_courses(
    refresh: bool = Query(default=False),
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    """
    Fetch all courses the currently logged-in user is enrolled in (uses short-lived per-user TTL cache).
    """
    try:
        raw_courses = await _get_cached_user_courses(session, refresh=refresh)
    except MoodleException as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Moodle error fetching courses: {exc.message}",
        )

    return [
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
        for c in raw_courses
    ]


@router.get("/{course_id}", response_model=CourseSummary)
async def get_course_detail(
    course_id: int,
    refresh: bool = Query(default=False),
    session: Dict[str, Any] = Depends(get_current_user_session),
):
    """
    Fetch summary metadata for a specific course by ID.
    """
    try:
        raw_courses = await _get_cached_user_courses(session, refresh=refresh)
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

            file_items = m.get("files") or [f for f in m.get("contents", []) if f.get("type", "file") == "file"]
            if not file_items and m.get("download_url"):
                file_items = [{"filename": f"{mod_name}.pdf", "fileurl": m["download_url"]}]

            if not file_items and mod_type == "resource" and m.get("url"):
                file_items = [{"filename": mod_name, "fileurl": m["url"], "module_resource": True}]

            for f in file_items:
                fname = f.get("filename") or f"{mod_name}.pdf"
                furl = f.get("fileurl") or m.get("download_url")
                fsize = f.get("filesize")
                f_safe, f_reason = (True, "") if f.get("module_resource") else restrictions.is_file_safe(fname, furl, fsize)
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
                    "download_api": f"/api/courses/{course_id}/files/download/{mod_id}" + ("" if f.get("module_resource") else f"?filename={quote(fname, safe='')}"),
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
        target_dir=_private_file_dir(session, course_id),
    )
    return result


@router.get("/{course_id}/files/download/{module_id}")
async def download_module_file(
    course_id: int,
    module_id: int,
    filename: Optional[str] = None,
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

    # Revalidate course membership before serving even an owner-scoped cached file.
    sections = await client.get_course_contents(token=token, course_id=course_id, auth_type=auth_type,
                                               sesskey=sesskey, base_url=site_url)
    module = next((m for section in sections for m in section.get("modules", []) if m.get("id") == module_id), None)
    if not module:
        raise HTTPException(status_code=404, detail="Файл не знайдено в цьому курсі.")
    allowed, _ = get_parsing_restrictions().is_module_safe(module.get("name", ""), module.get("modname", ""), module.get("url"))
    if not allowed or module.get("safety_status") == "restricted_exam":
        raise HTTPException(status_code=403, detail="Цей матеріал недоступний для завантаження.")
    local_dir = _private_file_dir(session, course_id)
    if os.path.exists(local_dir):
        for fname in os.listdir(local_dir):
            if fname.startswith(f"{module_id}_") and (filename is None or fname.split("_", 1)[-1] == filename):
                return FileResponse(os.path.join(local_dir, fname), filename=fname.split("_", 1)[-1])

    files = module.get("files") or [f for f in module.get("contents", []) if f.get("type", "file") == "file"]
    selected_file = next((f for f in files if filename is None or f.get("filename") == filename), None)
    if filename and files and not selected_file:
        raise HTTPException(status_code=404, detail="Файл не знайдено в цьому матеріалі.")
    target_url = (selected_file or {}).get("fileurl") or module.get("download_url") or module.get("url") or f"{site_url}/mod/resource/view.php?id={module_id}"
    if auth_type == "cookie":
        data = await client.fetch_module_resource(cookie=token, module_url=target_url,
                    modname="file" if selected_file else module.get("modname", "resource"),
                    max_bytes=get_settings().TEMP_STORAGE_MAX_FILE_BYTES)
        if not data:
            raise HTTPException(status_code=502, detail="Не вдалося отримати файл з Moodle.")
        name = quote(filename or data["filename"], safe="")
        return Response(data["raw_bytes"], media_type=data["content_type"], headers={"Content-Disposition": f"attachment; filename*=UTF-8''{name}", "Cache-Control": "private, no-store"})
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    }
    if auth_type == "cookie":
        headers["Cookie"] = f"MoodleSession={token}"
    elif auth_type == "token":
        target_url = f"{target_url}{'&' if '?' in target_url else '?'}wstoken={token}"

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=False, headers=headers) as http_client:
            from urllib.parse import urljoin
            for _ in range(5):
                if not client._is_same_moodle_origin(target_url):
                    raise HTTPException(status_code=400, detail="Файл перенаправляє за межі Moodle.")
                resp = await http_client.get(target_url)
                if resp.status_code not in (301, 302, 303, 307, 308):
                    break
                target_url = urljoin(target_url, resp.headers.get("location", ""))
            if resp.status_code == 200:
                if resp.headers.get("content-type", "").startswith("text/html") and client._looks_like_login_html(resp.text):
                    raise HTTPException(status_code=401, detail="Сесія Moodle завершилася.")
                c_disp = resp.headers.get("content-disposition", f"attachment; filename*=UTF-8''{quote(filename or f'module_{module_id}.pdf', safe='')}")
                c_type = resp.headers.get("content-type", "application/octet-stream")
                return Response(content=resp.content, media_type=c_type, headers={"Content-Disposition": c_disp})
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch file from Moodle")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Не вдалося отримати файл з Moodle.") from exc


@router.get("/{course_id}/files/archive")
async def download_course_archive(course_id: int, session: Dict[str, Any] = Depends(get_current_user_session)):
    result = await pull_all_course_files(course_id, session)
    downloaded = result.get("downloaded_files", [])
    if not downloaded:
        raise HTTPException(status_code=404, detail="У курсі немає доступних файлів для завантаження.")
    root = Path(_private_file_dir(session, course_id)).resolve()
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zipped:
        for item in downloaded:
            path = Path(item["saved_path"]).resolve()
            if path.is_relative_to(root) and path.is_file():
                zipped.write(path, path.name)
    return Response(archive.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": f'attachment; filename="hustle-course-{course_id}.zip"', "Cache-Control": "private, no-store"})


class VideoTranscriptionRequest(BaseModel):
    url: str
    module_id: Optional[int] = None
    course_id: Optional[int] = None


@router.post("/transcribe-video")
async def transcribe_video(req: VideoTranscriptionRequest, request: Request):
    """
    Zero-token video transcription first; falls back to cached Gemini video analysis when blocked or uncaptioned.
    """
    from app.services.video_transcriber import VideoTranscriberService
    from app.core.security import get_workspace_owner
    from app.services.learning_provider import LearningSettingsStore, learning_provider_scope
    from app.services.workspace_store import get_workspace_store

    try:
        res = await asyncio.wait_for(asyncio.to_thread(VideoTranscriberService.get_youtube_transcript, req.url), timeout=30)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Відеосервіс не відповів. Спробуй ще раз.")
    if res:
        return {
            "success": True,
            "video_id": res.get("video_id"),
            "language": res.get("language"),
            "full_text": res.get("full_text"),
            "segments": res.get("segments", []),
            "token_cost": 0,
        }

    store = get_workspace_store()
    try:
        owner = await get_workspace_owner(request, Response())
        owner_id = owner.owner_id
    except Exception:
        owner_id = "__server__"
    try:
        provider = LearningSettingsStore(store.db_path).get(owner_id)
    except Exception:
        provider = None

    if provider:
        with learning_provider_scope(provider):
            digest = await store.resolve_youtube_digest(req.url)
        if digest and digest.get("text"):
            return {
                "success": True,
                "video_id": digest.get("video_id"),
                "language": digest.get("language") or "uk",
                "full_text": digest["text"],
                "segments": [],
                "source": digest.get("source"),
                "token_cost": digest.get("token_cost", 1),
            }

    return {
        "success": False,
        "message": "Субтитри або транскрипт не знайдено для цього відео (або відео недоступне).",
        "token_cost": 0,
    }

