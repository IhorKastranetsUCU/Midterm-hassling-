import asyncio
import json
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import get_settings
from app.core.authorities import resolve_authority_slug
from app.core.events import AcademicEvent, event_bus
from app.core.exceptions import MoodleAPIError, MoodleAuthError, MoodleConnectionError
from app.core.security import (
    WorkspaceOwner,
    create_workspace_jwt,
    get_current_user_session,
    get_workspace_owner,
    get_workspace_session_owner,
    owner_storage_slug,
)
from app.models.mix import (
    CourseToolsConfig,
    ExtensionModuleItem,
    ExtensionSectionPayload,
    ExtensionSyncPayload,
    QuizAttemptRequest,
    QuizSafetyMetadata,
    SyncDiffRequest,
    SyncDiffResponse,
    WorkspaceCourseSummary,
    compute_content_hash,
)
from app.services.build_queue import get_build_queue
from app.services.mix_generator import extract_text_from_upload
from app.services.moodle_client import MoodleClient
from app.services.temp_storage import is_allowed_staging_filename
from app.services.workspace_store import get_workspace_store

router = APIRouter(tags=["Workspace & Extension Sync"])


class NotesUpdateRequest(BaseModel):
    notes: str = ""


class ManualCourseTextRequest(BaseModel):
    title: str
    shortname: Optional[str] = "COURSE"
    authority: str = "custom"
    topic_title: Optional[str] = None
    content_text: str
    tools_config: Optional[CourseToolsConfig] = None
    course_id: Optional[int] = None


@router.get("/api/workspace/session")
async def get_workspace_session_info(
    owner: WorkspaceOwner = Depends(get_workspace_session_owner),
) -> Dict[str, Any]:
    """Resolve current isolated owner identity and issue a workspace token for extension sync."""
    return {
        "owner_id": owner.owner_id,
        "auth_mode": owner.auth_mode,
        "workspace_token": create_workspace_jwt(owner.owner_id),
    }


@router.get("/api/workspace/events/stream")
async def stream_workspace_events(
    request: Request,
    max_events: Optional[int] = Query(default=None, ge=1),
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    """Owner-scoped SSE stream delivering workspace.synced, topic.update_available, and mix.ready."""
    queue = event_bus.subscribe(user_id=owner.owner_id)

    async def event_generator():
        sent = 0
        try:
            init_evt = AcademicEvent(
                type="system.connected",
                title="Workspace Live Stream Connected",
                message="Listening for background build & sync updates.",
                severity="info",
                owner_id=owner.owner_id,
                data={"owner_id": owner.owner_id},
            )
            yield init_evt.to_sse_format()
            sent += 1

            while max_events is None or sent < max_events:
                if await request.is_disconnected():
                    break
                try:
                    evt = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield evt.to_sse_format()
                    sent += 1
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        finally:
            event_bus.unsubscribe(queue, user_id=owner.owner_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/api/workspace/events")
async def list_workspace_events(
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> List[AcademicEvent]:
    """Return recent workspace events isolated strictly to the current owner."""
    return event_bus.get_recent_events(owner_id=owner.owner_id)


@router.post("/api/sync/diff", response_model=SyncDiffResponse)
async def diff_extension_modules(
    req: SyncDiffRequest,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> SyncDiffResponse:
    """Pre-flight module/chunk hash diff (~1 KB) so the client uploads only changed modules."""
    store = get_workspace_store()
    return store.compute_sync_diff(req, owner_id=owner.owner_id)


@router.post("/api/sync/extension")
async def sync_from_extension(
    payload: ExtensionSyncPayload,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """
    Ingest Moodle course sections & diffs pushed from the Chrome/Edge Extension.
    Runs the fail-closed exam safety policy filter before persisting or indexing anything.
    """
    store = get_workspace_store()
    result = await store.sync_extension_payload(payload, owner_id=owner.owner_id)

    event_type = "topic.update_available" if result["updated_topics"] > 0 else "workspace.synced"
    await event_bus.publish(
        AcademicEvent(
            type=event_type,
            title=f"Extension Synced: {payload.course_name}",
            message=(
                f"{result['new_topics']} new, {result['updated_topics']} updated, "
                f"{result['unchanged_topics']} unchanged"
                + (f" ({result['blocked_exams']} restricted quizzes shielded)" if result["blocked_exams"] else "")
            ),
            severity="warning" if result["updated_topics"] > 0 else "success",
            user_id=owner.moodle_user_id,
            owner_id=owner.owner_id,
            data={
                "course_id": result["course_id"],
                "authority": result["authority"],
                "workspace_path": f"/{result['authority']}/courses/{result['course_id']}",
            },
        )
    )

    return {
        "success": True,
        "workspace_url": f"/{result['authority']}/courses/{result['course_id']}",
        "owner_id": owner.owner_id,
        "summary": result,
    }


@router.get("/api/workspace/courses", response_model=List[WorkspaceCourseSummary])
async def list_workspace_courses(
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> List[WorkspaceCourseSummary]:
    """List courses synced or uploaded by the current isolated user only."""
    store = get_workspace_store()
    return store.list_courses(owner_id=owner.owner_id)


@router.post("/api/workspace/courses/create-text")
async def create_or_append_text_course(
    req: ManualCourseTextRequest,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Create a standalone course workspace (or add a topic) from pasted notes/text + tool checkboxes."""
    if not req.content_text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Study material text cannot be empty.")

    store = get_workspace_store()
    tools = req.tools_config or CourseToolsConfig()
    result = await store.create_or_ingest_upload(
        owner_id=owner.owner_id,
        title=req.topic_title or req.title,
        authority=req.authority,
        content_text=req.content_text.strip(),
        filename="pasted-notes.md",
        tools=tools,
        course_id=req.course_id,
        shortname=req.shortname,
    )

    await event_bus.publish(
        AcademicEvent(
            type="workspace.synced",
            title=f"Workspace Ready: {req.title}",
            message="Structured TopicMix generated with selected tool checkboxes.",
            severity="success",
            user_id=owner.moodle_user_id,
            owner_id=owner.owner_id,
            data={"course_id": result["course_id"], "authority": result["authority"]},
        )
    )

    return {
        "success": True,
        "workspace_url": f"/{result['authority']}/courses/{result['course_id']}",
        "owner_id": owner.owner_id,
        **result,
    }


@router.post("/api/workspace/courses/upload")
async def upload_course_material(
    file: UploadFile = File(...),
    course_title: str = Form("Uploaded Study Course"),
    shortname: str = Form("STUDY"),
    authority: str = Form("custom"),
    course_id: Optional[int] = Form(None),
    tools_json: Optional[str] = Form(None),
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """
    Drag & Drop file upload (.pdf, .txt, .md, .docx, .pptx, .html) to create or enrich a course workspace
    without requiring Moodle credentials.
    """
    settings = get_settings()
    filename = file.filename or "upload.txt"
    if not is_allowed_staging_filename(filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file extension. Allowed: .pdf, .pptx, .docx, .html, .txt, .md, .csv, .json.",
        )

    max_upload_bytes = settings.TEMP_STORAGE_MAX_FILE_BYTES
    upload_chunks: List[bytes] = []
    total_size = 0
    while True:
        chunk = await file.read(65536)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > max_upload_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds {max_upload_bytes // (1024 * 1024)} MB limit.",
            )
        upload_chunks.append(chunk)
    raw_bytes = b"".join(upload_chunks)
    if not raw_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    try:
        tools = CourseToolsConfig.model_validate_json(tools_json) if tools_json else CourseToolsConfig()
    except Exception:
        tools = CourseToolsConfig()

    store = get_workspace_store()
    staged = await asyncio.to_thread(
        store.stage_material,
        owner_id=owner.owner_id,
        course_id=course_id or 0,
        module_id=0,
        filename=filename,
        raw_bytes=raw_bytes,
        content_type=file.content_type or "application/octet-stream",
        safety_status="safe_material",
    )
    staging_id = staged["staging_id"]

    try:
        extracted_text = await asyncio.to_thread(extract_text_from_upload, filename, raw_bytes)
        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file could not be validated or contains no extractable text.",
            )
        await asyncio.to_thread(store.mark_staged_validated, owner.owner_id, staging_id)

        result = await store.create_or_ingest_upload(
            owner_id=owner.owner_id,
            title=course_title.strip() or filename,
            authority=authority.strip() or "custom",
            content_text=extracted_text,
            filename=filename,
            tools=tools,
            course_id=course_id,
            shortname=shortname.strip() or "STUDY",
        )
        await asyncio.to_thread(store.mark_staged_processed, owner.owner_id, staging_id)
    finally:
        if settings.TEMP_STORAGE_AUTO_PURGE:
            await asyncio.to_thread(
                store.purge_staged_material, owner.owner_id, staging_id, "purged"
            )

    await event_bus.publish(
        AcademicEvent(
            type="workspace.synced",
            title=f"Material Imported: {filename}",
            message=f"Added topic pack into '{course_title}'.",
            severity="success",
            owner_id=owner.owner_id,
            data={"course_id": result["course_id"], "authority": result["authority"]},
        )
    )

    return {
        "success": True,
        "workspace_url": f"/{result['authority']}/courses/{result['course_id']}",
        "owner_id": owner.owner_id,
        "staging_id": staging_id,
        "staging_purged": bool(settings.TEMP_STORAGE_AUTO_PURGE),
        "extracted_chars": len(extracted_text),
        **result,
    }


class BackendMoodleSyncRequest(BaseModel):
    course_title: Optional[str] = None
    shortname: Optional[str] = None
    authority: Optional[str] = None
    tools_config: Optional[CourseToolsConfig] = None
    fetch_files: bool = True


@router.post("/api/workspace/courses/{course_id}/sync-moodle")
async def sync_course_from_moodle_backend(
    course_id: int,
    req: Optional[BackendMoodleSyncRequest] = None,
    session: Dict[str, Any] = Depends(get_current_user_session),
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """
    Use the user's paired MoodleSession cookie (from HttpOnly JWT, never stored in DB)
    to fetch course sections, PDFs/pages/resources directly on the backend, stage them temporarily
    in per-person isolated storage during validation & extraction, and purge raw files afterward.
    """
    settings = get_settings()
    store = get_workspace_store()
    req_body = req or BackendMoodleSyncRequest()

    moodle_url = (session.get("site_url") or settings.MOODLE_BASE_URL).rstrip("/")
    moodle_token = session["moodle_token"]
    auth_type = session.get("auth_type", "cookie")
    sesskey = session.get("sesskey")
    client = MoodleClient(base_url=moodle_url)

    course_title = (req_body.course_title or "").strip() or f"Course {course_id}"
    course_short = (req_body.shortname or "").strip() or f"C{course_id}"

    try:
        contents_coro = client.get_course_contents(
            token=moodle_token,
            course_id=course_id,
            auth_type=auth_type,
            sesskey=sesskey,
        )
        if not req_body.course_title:
            courses_coro = client.get_user_courses(
                token=moodle_token,
                user_id=session["user_id"],
                auth_type=auth_type,
                sesskey=sesskey,
            )
            raw_sections, courses_res = await asyncio.gather(
                contents_coro, courses_coro, return_exceptions=True
            )
            if isinstance(raw_sections, Exception):
                raise raw_sections
            if isinstance(courses_res, list):
                for c in courses_res:
                    if int(c.get("id", 0)) == course_id:
                        course_title = c.get("fullname") or course_title
                        course_short = c.get("shortname") or course_short
                        break
        else:
            raw_sections = await contents_coro
    except MoodleAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message or "MoodleSession expired.")
    except MoodleConnectionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.message or "Cannot reach Moodle.")
    except MoodleAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.message or "Moodle API error.")

    staged_ids: List[str] = []
    downloaded_files = 0
    skipped_unchanged_downloads = 0
    manifest_updates: List[Dict[str, Any]] = []
    sections_payload: List[ExtensionSectionPayload] = []

    # Prepare bounded concurrent downloads using one shared pooled HTTP client
    download_sem = asyncio.Semaphore(5)
    allow_file_fetch = bool(req_body.fetch_files and auth_type == "cookie" and not str(moodle_token).startswith("mock_"))
    existing_manifest = await asyncio.to_thread(store.get_course_file_manifest, owner.owner_id, course_id)
    prior_chunks = await asyncio.to_thread(store.get_course_module_chunks_map, owner.owner_id, course_id)

    async def _download_stage_extract(
        http_client: httpx.AsyncClient,
        mod_id: int,
        mod_type: str,
        candidate_url: str,
        timemodified: int,
    ) -> Optional[Dict[str, Any]]:
        async with download_sem:
            dl = await client.fetch_module_resource(
                cookie=moodle_token,
                module_url=candidate_url,
                modname=mod_type,
                max_bytes=settings.TEMP_STORAGE_MAX_FILE_BYTES,
                http_client=http_client,
            )
            if not dl or not dl.get("raw_bytes"):
                return None
            if not is_allowed_staging_filename(dl["filename"]):
                return None
            staged = await asyncio.to_thread(
                store.stage_material,
                owner_id=owner.owner_id,
                course_id=course_id,
                module_id=mod_id,
                filename=dl["filename"],
                raw_bytes=dl["raw_bytes"],
                content_type=dl.get("content_type") or "application/octet-stream",
                safety_status="safe_material",
            )
            parsed_text = dl.get("text_excerpt") or await asyncio.to_thread(
                extract_text_from_upload, dl["filename"], dl["raw_bytes"]
            )
            if not parsed_text or not parsed_text.strip():
                await asyncio.to_thread(
                    store.purge_staged_material, owner.owner_id, staged["staging_id"], "purged"
                )
                return None
            await asyncio.to_thread(store.mark_staged_validated, owner.owner_id, staged["staging_id"])
            return {
                "staging_id": staged["staging_id"],
                "sha256_hash": staged["sha256_hash"],
                "parsed_text": parsed_text,
                "remote_url": candidate_url,
                "moodle_timemodified": timemodified,
            }

    try:
        dl_jobs: List[Tuple[int, int, Any]] = []
        parsed_sections_meta: List[Dict[str, Any]] = []

        for idx, sec in enumerate(raw_sections):
            raw_sec_idx = sec.get("section") if sec.get("section") is not None else sec.get("id")
            sec_idx = int(raw_sec_idx) if raw_sec_idx is not None else idx
            sec_name = sec.get("name") or f"Section {sec_idx}"
            sec_summary = MoodleClient._clean_html_text(sec.get("summary") or "")
            mod_entries: List[Dict[str, Any]] = []

            for mod in sec.get("modules", []) or []:
                mod_id = int(mod.get("id", 0) or 0)
                mod_name = mod.get("name") or f"Module {mod_id}"
                mod_type = (mod.get("modname") or "resource").lower().strip()
                mod_url = mod.get("url") or ""
                mod_desc = MoodleClient._clean_html_text(mod.get("description") or "")

                # Step 1: Filter first (Exam Shield fail-closed before touching URLs/files)
                quiz_meta = None
                safety = "safe_material"
                if mod_type == "quiz":
                    quiz_meta = QuizSafetyMetadata(
                        name=mod_name,
                        attempts=1,
                        timelimit_seconds=1,
                        review_correctness_allowed=False,
                    )
                    safety = quiz_meta.classify_safety()

                candidate_url = mod_url
                timemodified = int(mod.get("timemodified") or 0)
                contents = mod.get("contents") or []
                if isinstance(contents, list) and contents:
                    if contents[0].get("fileurl"):
                        candidate_url = contents[0]["fileurl"]
                    if not timemodified and contents[0].get("timemodified"):
                        timemodified = int(contents[0]["timemodified"] or 0)

                mod_entries.append(
                    {
                        "mod_id": mod_id,
                        "mod_name": mod_name,
                        "mod_type": mod_type,
                        "mod_url": mod_url,
                        "mod_desc": mod_desc,
                        "candidate_url": candidate_url,
                        "timemodified": timemodified,
                        "quiz_meta": quiz_meta,
                        "safety": safety,
                    }
                )
            parsed_sections_meta.append(
                {
                    "sec_idx": sec_idx,
                    "sec_name": sec_name,
                    "sec_summary": sec_summary,
                    "mods": mod_entries,
                }
            )

        # Step 2 & 3: Diff against file_manifest before downloading; stream eligible changed files
        dl_results: Dict[Tuple[int, int], Dict[str, Any]] = {}
        reused_from_manifest: Dict[Tuple[int, int], Dict[str, Any]] = {}
        if allow_file_fetch:
            async with httpx.AsyncClient(
                timeout=max(settings.MOODLE_REQUEST_TIMEOUT, 30.0),
                follow_redirects=False,
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=8),
            ) as shared_http:
                for s_pos, sec_meta in enumerate(parsed_sections_meta):
                    for m_pos, m_entry in enumerate(sec_meta["mods"]):
                        if m_entry["safety"] == "restricted_exam" or m_entry["mod_type"] == "quiz":
                            continue
                        cand_url = m_entry["candidate_url"]
                        if not cand_url or m_entry["mod_type"] not in ("resource", "page", "book", "folder", "url", "file"):
                            continue

                        man_row = existing_manifest.get(m_entry["mod_id"])
                        prior_ch = prior_chunks.get(m_entry["mod_id"])
                        if (
                            man_row
                            and prior_ch
                            and man_row.get("remote_url") == cand_url
                            and int(man_row.get("moodle_timemodified") or 0) == int(m_entry["timemodified"] or 0)
                        ):
                            reused_from_manifest[(s_pos, m_pos)] = {
                                "sha256_hash": man_row["sha256_hash"],
                                "parsed_text": prior_ch["content_text"],
                                "module_hash": prior_ch["module_hash"],
                            }
                            manifest_updates.append(
                                {
                                    "module_id": m_entry["mod_id"],
                                    "remote_url": cand_url,
                                    "moodle_timemodified": m_entry["timemodified"],
                                    "sha256_hash": man_row["sha256_hash"],
                                }
                            )
                            skipped_unchanged_downloads += 1
                            continue

                        dl_jobs.append(
                            (
                                s_pos,
                                m_pos,
                                _download_stage_extract(
                                    shared_http,
                                    m_entry["mod_id"],
                                    m_entry["mod_type"],
                                    cand_url,
                                    m_entry["timemodified"],
                                ),
                            )
                        )

                if dl_jobs:
                    outcomes = await asyncio.gather(*(job[2] for job in dl_jobs), return_exceptions=True)
                    for (s_pos, m_pos, _), outcome in zip(dl_jobs, outcomes):
                        if isinstance(outcome, MoodleAuthError):
                            raise HTTPException(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail=outcome.message or "MoodleSession expired during download.",
                            )
                        if isinstance(outcome, (ValueError, MoodleConnectionError, httpx.HTTPError)):
                            continue
                        if isinstance(outcome, Exception):
                            raise outcome
                        if isinstance(outcome, dict):
                            dl_results[(s_pos, m_pos)] = outcome
                            staged_ids.append(outcome["staging_id"])
                            manifest_updates.append(
                                {
                                    "module_id": parsed_sections_meta[s_pos]["mods"][m_pos]["mod_id"],
                                    "remote_url": outcome["remote_url"],
                                    "moodle_timemodified": outcome["moodle_timemodified"],
                                    "sha256_hash": outcome["sha256_hash"],
                                }
                            )
                            downloaded_files += 1

        for s_pos, sec_meta in enumerate(parsed_sections_meta):
            mod_items: List[ExtensionModuleItem] = []
            for m_pos, m_entry in enumerate(sec_meta["mods"]):
                mod_id = m_entry["mod_id"]
                mod_name = m_entry["mod_name"]
                mod_type = m_entry["mod_type"]
                mod_url = m_entry["mod_url"]
                mod_desc = m_entry["mod_desc"]

                if m_entry["mod_type"] == "quiz" or m_entry["safety"] == "restricted_exam":
                    mod_items.append(
                        ExtensionModuleItem(
                            module_id=mod_id,
                            name=mod_name,
                            modname=mod_type,
                            url=mod_url,
                            text_excerpt=mod_desc[:500] if mod_desc else None,
                            quiz_meta=m_entry["quiz_meta"],
                        )
                    )
                    continue

                extracted_excerpt = mod_desc
                file_hashes: List[str] = []
                mod_hash_override: Optional[str] = None
                reused = reused_from_manifest.get((s_pos, m_pos))
                dl_out = dl_results.get((s_pos, m_pos))

                if reused:
                    file_hashes.append(reused["sha256_hash"])
                    mod_hash_override = reused["module_hash"]
                    extracted_excerpt = None  # already unchanged; store keeps prior chunk text
                elif dl_out:
                    file_hashes.append(dl_out["sha256_hash"])
                    parsed_text = dl_out.get("parsed_text")
                    if parsed_text:
                        extracted_excerpt = f"{mod_desc}\n\n{parsed_text}".strip() if mod_desc else parsed_text

                mod_hash = mod_hash_override or compute_content_hash(
                    f"{mod_id}|{mod_type}|{mod_name}|{extracted_excerpt}|{'|'.join(file_hashes)}"
                )
                mod_items.append(
                    ExtensionModuleItem(
                        module_id=mod_id,
                        name=mod_name,
                        modname=mod_type,
                        url=mod_url,
                        text_excerpt=extracted_excerpt[:16000] if extracted_excerpt else None,
                        module_hash=mod_hash,
                        file_hashes=file_hashes,
                    )
                )

            sections_payload.append(
                ExtensionSectionPayload(
                    section_index=sec_meta["sec_idx"],
                    title=sec_meta["sec_name"],
                    summary=sec_meta["sec_summary"],
                    modules=mod_items,
                )
            )

        tools = req_body.tools_config
        if tools is None:
            existing = store.get_course_bundle(course_id, owner_id=owner.owner_id)
            if existing and existing.get("tools_config"):
                tools = CourseToolsConfig.model_validate(existing["tools_config"])
            else:
                tools = CourseToolsConfig()

        authority_slug = (req_body.authority or "").strip() or resolve_authority_slug(moodle_url)
        sync_payload = ExtensionSyncPayload(
            course_id=course_id,
            course_name=course_title,
            course_shortname=course_short,
            moodle_url=moodle_url,
            authority=authority_slug,
            tools_config=tools,
            sections=sections_payload,
        )
        sync_res = await store.sync_extension_payload(sync_payload, owner_id=owner.owner_id)
        if manifest_updates:
            await asyncio.to_thread(store.upsert_file_manifest_batch, owner.owner_id, course_id, manifest_updates)
        if staged_ids:
            await asyncio.to_thread(store.mark_staged_processed_batch, owner.owner_id, staged_ids)
    finally:
        if settings.TEMP_STORAGE_AUTO_PURGE and staged_ids:
            await asyncio.to_thread(
                store.purge_staged_materials_batch, owner.owner_id, staged_ids, "purged"
            )

    await event_bus.publish(
        AcademicEvent(
            type="workspace.synced",
            title=f"Moodle Sync Complete: {course_title}",
            message=f"Fetched {downloaded_files} resource(s) (skipped {skipped_unchanged_downloads} unchanged) via paired MoodleSession.",
            severity="success",
            owner_id=owner.owner_id,
            data={"course_id": course_id, "authority": sync_res["authority"]},
        )
    )

    return {
        "success": True,
        "owner_id": owner.owner_id,
        "course_id": course_id,
        "downloaded_files": downloaded_files,
        "skipped_unchanged_downloads": skipped_unchanged_downloads,
        "staged_count": len(staged_ids),
        "staging_purged": bool(settings.TEMP_STORAGE_AUTO_PURGE),
        **sync_res,
    }


@router.get("/api/workspace/storage/staging")
async def list_my_staged_files(
    course_id: Optional[int] = Query(default=None),
    include_purged: bool = Query(default=False),
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """List temporary staged file records strictly isolated to the authenticated owner."""
    store = get_workspace_store()
    items = store.list_staged_materials(
        owner_id=owner.owner_id,
        course_id=course_id,
        include_purged=include_purged,
    )
    return {
        "owner_id": owner.owner_id,
        "owner_storage_slug": owner_storage_slug(owner.owner_id),
        "items": items,
    }


@router.post("/api/workspace/storage/cleanup")
async def cleanup_my_expired_staging(
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Purge expired temporary staged files belonging to the current owner."""
    purged = get_workspace_store().cleanup_expired_staging(owner_id=owner.owner_id)
    return {"success": True, "owner_id": owner.owner_id, "purged_count": purged}


@router.get("/api/workspace/courses/{course_id}")
async def get_workspace_course(
    course_id: int,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Retrieve complete study workspace bundle owned by the current user."""
    store = get_workspace_store()
    bundle = store.get_course_bundle(course_id, owner_id=owner.owner_id)
    if not bundle:
        raise HTTPException(status_code=404, detail=f"Workspace course {course_id} not found.")
    return {
        "course": bundle["course"].model_dump(mode="json"),
        "tools_config": bundle["tools_config"],
        "sections": bundle["sections"],
        "topic_mixes": [m.model_dump(mode="json") for m in bundle["topic_mixes"]],
        "exam_mix": bundle["exam_mix"].model_dump(mode="json") if bundle["exam_mix"] else None,
        "blocked_quizzes": [b.model_dump(mode="json") for b in bundle["blocked_quizzes"]],
    }


@router.get("/api/workspace/courses/{course_id}/jobs")
async def get_course_build_jobs(
    course_id: int,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Inspect debounced background build queue status for an isolated user's course."""
    store = get_workspace_store()
    bundle = store.get_course_bundle(course_id, owner_id=owner.owner_id)
    if not bundle:
        raise HTTPException(status_code=404, detail=f"Workspace course {course_id} not found.")
    return {
        "course_id": course_id,
        "exam_mix_stale": bundle["course"].exam_mix_stale,
        "jobs": get_build_queue().get_jobs(owner.owner_id, course_id),
    }


@router.put("/api/workspace/courses/{course_id}/tools")
async def update_course_tools(
    course_id: int,
    tools: CourseToolsConfig,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Update enabled study tools checkboxes incrementally (computes only newly enabled artifacts)."""
    store = get_workspace_store()
    if not store.update_tools_config(course_id, tools, owner_id=owner.owner_id):
        raise HTTPException(status_code=404, detail=f"Workspace course {course_id} not found.")
    res = await store.regenerate_course_mixes_detailed(course_id, owner_id=owner.owner_id) or {
        "topic_mixes": [],
        "recomputed_artifacts": [],
        "reused_artifacts": [],
        "cache_hits": 0,
        "exam_mix_stale": False,
    }
    bundle = store.get_course_bundle(course_id, owner_id=owner.owner_id)
    return {
        "success": True,
        "tools_config": tools.model_dump(),
        "topic_count": len(res["topic_mixes"]),
        "has_exam_mix": bool(bundle and bundle["exam_mix"]),
        "exam_mix_stale": res["exam_mix_stale"],
        "recomputed_artifacts": res["recomputed_artifacts"],
        "reused_artifacts": res["reused_artifacts"],
        "cache_hits": res["cache_hits"],
    }


@router.post("/api/workspace/courses/{course_id}/generate")
async def regenerate_course_mixes(
    course_id: int,
    force: bool = False,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Re-run MixGenerator incrementally (or force full rebuild with ?force=true)."""
    store = get_workspace_store()
    res = await store.regenerate_course_mixes_detailed(
        course_id, owner_id=owner.owner_id, force_full=force
    )
    if res is None:
        raise HTTPException(status_code=404, detail=f"Workspace course {course_id} not found.")
    return {
        "success": True,
        "topic_mixes": [m.model_dump(mode="json") for m in res["topic_mixes"]],
        "recomputed_artifacts": res["recomputed_artifacts"],
        "reused_artifacts": res["reused_artifacts"],
        "cache_hits": res["cache_hits"],
        "exam_mix_stale": res["exam_mix_stale"],
    }


@router.post("/api/workspace/courses/{course_id}/exam-mix")
async def build_course_exam_mix(
    course_id: int,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Synthesize Level 2 ExamMix ('Mix of Mixes') incrementally from compact TopicDigests."""
    store = get_workspace_store()
    exam_mix = await store.build_exam_mix(course_id, owner_id=owner.owner_id)
    if not exam_mix:
        raise HTTPException(
            status_code=404,
            detail=f"Cannot build Exam Mix: course {course_id} has no synced topics yet.",
        )
    return {
        "success": True,
        "exam_mix_stale": False,
        "incremental_updates": exam_mix.incremental_updates,
        "cached_topics_reused": exam_mix.cached_topics_reused,
        "exam_mix": exam_mix.model_dump(mode="json"),
    }


@router.patch("/api/workspace/mixes/{mix_id}/notes")
async def save_mix_notes(
    mix_id: str,
    req: NotesUpdateRequest,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Persist student's personal notes on their own TopicMix without touching upstream source."""
    store = get_workspace_store()
    updated = store.save_mix_notes(mix_id, req.notes, owner_id=owner.owner_id)
    if not updated:
        raise HTTPException(status_code=404, detail=f"TopicMix '{mix_id}' not found.")
    return {"success": True, "mix_id": updated.mix_id, "user_notes": updated.user_notes}


@router.post("/api/workspace/mixes/{mix_id}/ack-update")
async def apply_upstream_mix_update(
    mix_id: str,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Refresh user's TopicMix from newly synced Moodle snapshot while preserving personal user_notes."""
    store = get_workspace_store()
    updated = await store.acknowledge_mix_update(mix_id, owner_id=owner.owner_id)
    if not updated:
        raise HTTPException(status_code=404, detail=f"TopicMix '{mix_id}' not found.")
    return {"success": True, "mix": updated.model_dump(mode="json")}


@router.post("/api/workspace/mixes/{mix_id}/quiz-attempt")
async def submit_mix_quiz_attempt(
    mix_id: str,
    req: QuizAttemptRequest,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Record student's practice answer to guide per-user weak_spots_focus in ExamMix."""
    store = get_workspace_store()
    res = store.record_quiz_attempt(mix_id, req, owner_id=owner.owner_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"TopicMix '{mix_id}' not found.")
    return {"success": True, **res}


@router.delete("/api/workspace/courses/{course_id}")
async def delete_workspace_course(
    course_id: int,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Delete this user's private course workspace and all associated snapshots/mixes."""
    store = get_workspace_store()
    if not store.delete_course(course_id, owner_id=owner.owner_id):
        raise HTTPException(status_code=404, detail=f"Workspace course {course_id} not found.")
    return {"success": True, "deleted_course_id": course_id}
