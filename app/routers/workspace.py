import asyncio
import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.events import AcademicEvent, event_bus
from app.core.security import (
    WorkspaceOwner,
    create_workspace_jwt,
    get_workspace_owner,
    get_workspace_session_owner,
    get_optional_moodle_session,
)
from app.models.mix import (
    CourseToolsConfig,
    ExtensionSyncPayload,
    QuizAttemptRequest,
    SyncDiffRequest,
    SyncDiffResponse,
    WorkspaceCourseSummary,
    TopicPreviewItem,
    CourseStructurePreview,
    PreviewStructureRequest,
    ConfirmStructureRequest,
)
from app.services.build_queue import get_build_queue
from app.services.mix_generator import (
    extract_text_from_upload,
    generate_course_structure_from_syllabus,
)
from app.services.moodle_client import MoodleClient
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


@router.post("/api/workspace/courses/preview-structure", response_model=CourseStructurePreview)
async def preview_course_structure(
    req: PreviewStructureRequest,
    request: Request,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> CourseStructurePreview:
    """
    AI Course Architect: analyzes Moodle syllabus & sections (or custom text) and generates
    a proposed topic roadmap with key concepts, estimated hours, and depth before user confirmation.
    """
    course_id = req.course_id or 101
    course_title = req.title or f"Course {course_id}"
    shortname = f"CRS-{course_id}"
    sections = None
    custom_text = req.custom_syllabus_text

    # 1. Try pulling real Moodle sections if user has an active session
    session = get_optional_moodle_session(request)
    if session and session.get("moodle_token") and req.course_id:
        try:
            client = MoodleClient(base_url=session.get("site_url"))
            sections = await client.get_course_contents(
                token=session["moodle_token"],
                course_id=req.course_id,
                auth_type=session.get("auth_type", "token"),
                sesskey=session.get("sesskey"),
                base_url=session.get("site_url"),
            )
            raw_courses = await client.get_user_courses(
                token=session["moodle_token"],
                user_id=session["user_id"],
                auth_type=session.get("auth_type", "token"),
                sesskey=session.get("sesskey"),
                base_url=session.get("site_url"),
            )
            for c in raw_courses:
                if c.get("id") == req.course_id:
                    course_title = c.get("fullname", course_title)
                    shortname = c.get("shortname", shortname)
                    break
        except Exception:
            pass

    # 2. If in demo/mock mode or no sections returned
    if not sections and not custom_text:
        from app.services.mock_data import MOCK_COURSES, MOCK_COURSE_CONTENTS
        for mc in MOCK_COURSES:
            if mc.get("id") == req.course_id:
                course_title = mc.get("fullname", course_title)
                shortname = mc.get("shortname", shortname)
                break
        sections = MOCK_COURSE_CONTENTS.get(req.course_id or 101, MOCK_COURSE_CONTENTS.get(101))

    preview = await generate_course_structure_from_syllabus(
        course_id=course_id,
        title=course_title,
        shortname=shortname,
        authority=req.authority,
        target_score=req.target_score,
        custom_syllabus_text=custom_text,
        sections=sections,
        tools_config=req.tools_config,
        gemini_api_key=req.gemini_api_key,
    )
    return preview


@router.post("/api/workspace/courses/confirm-structure")
async def confirm_course_structure(
    req: ConfirmStructureRequest,
    request: Request,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """
    Confirm and persist the AI-generated course structure.
    Creates the course in the database, maps real Moodle materials (video, audio, lectures, self-tests)
    with their analyzed key-items to each topic, synthesizes TopicMixes, and launches the study workspace.
    """
    store = get_workspace_store()
    tools = req.tools_config or CourseToolsConfig()

    sections = None
    session = get_optional_moodle_session(request)
    if session and session.get("moodle_token") and req.course_id:
        try:
            client = MoodleClient(base_url=session.get("site_url"))
            sections = await client.get_course_contents(
                token=session["moodle_token"],
                course_id=req.course_id,
                auth_type=session.get("auth_type", "token"),
                sesskey=session.get("sesskey"),
                base_url=session.get("site_url"),
            )
        except Exception:
            pass

    if not sections and (req.authority == "mock" or req.course_id in (101, 102, 103, 104)):
        from app.services.mock_data import MOCK_COURSE_CONTENTS
        sections = MOCK_COURSE_CONTENTS.get(req.course_id)

    result = await store.create_course_from_confirmed_structure(
        owner_id=owner.owner_id,
        course_id=req.course_id,
        title=req.title,
        shortname=req.shortname or "COURSE",
        authority=req.authority,
        target_score=req.target_score,
        topics=req.topics,
        tools=tools,
        gemini_api_key=req.gemini_api_key,
        moodle_sections=sections,
    )

    await event_bus.publish(
        AcademicEvent(
            type="workspace.synced",
            title=f"Course Created: {req.title}",
            message=f"AI synthesized {len(req.topics)} topics from syllabus. Workspace ready!",
            severity="success",
            user_id=owner.moodle_user_id,
            owner_id=owner.owner_id,
            data={"course_id": result["course_id"], "authority": result["authority"]},
        )
    )

    return result


@router.post("/api/workspace/courses/{course_id}/auto-cluster")
async def auto_cluster_course(
    course_id: int,
    request: Request,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """
    Automatic end-to-end curriculum architect & material clusterer:
    When a user opens a course, automatically analyzes all Moodle sections and files,
    extracts strictly the canonical topics defined in the syllabus, clusters all materials
    (with zero-token video transcription and key items), and builds the complete study workspace.
    """
    store = get_workspace_store()
    existing = store.get_course_bundle(course_id, owner_id=owner.owner_id)
    if existing and existing.get("topic_mixes") and len(existing.get("topic_mixes", [])) > 0:
        return {"success": True, "message": "Workspace already exists", "bundle": existing}

    sections = None
    course_title = f"Course #{course_id}"
    shortname = f"CRS-{course_id}"
    authority = "ucu"

    session = get_optional_moodle_session(request)
    if session and session.get("moodle_token"):
        try:
            client = MoodleClient(base_url=session.get("site_url"))
            sections = await client.get_course_contents(
                token=session["moodle_token"],
                course_id=course_id,
                auth_type=session.get("auth_type", "token"),
                sesskey=session.get("sesskey"),
                base_url=session.get("site_url"),
            )
            raw_courses = await client.get_user_courses(
                token=session["moodle_token"],
                user_id=session["user_id"],
                auth_type=session.get("auth_type", "token"),
                sesskey=session.get("sesskey"),
                base_url=session.get("site_url"),
            )
            for c in raw_courses:
                if c.get("id") == course_id:
                    course_title = c.get("fullname", course_title)
                    shortname = c.get("shortname", shortname)
                    break
        except Exception as exc:
            logger.warning(f"Failed to fetch live Moodle contents for auto-cluster: {exc}")

    if not sections:
        from app.services.mock_data import MOCK_COURSES, MOCK_COURSE_CONTENTS
        for mc in MOCK_COURSES:
            if mc.get("id") == course_id:
                course_title = mc.get("fullname", course_title)
                shortname = mc.get("shortname", shortname)
                break
        sections = MOCK_COURSE_CONTENTS.get(course_id) or MOCK_COURSE_CONTENTS.get(101, [])

    preview = await generate_course_structure_from_syllabus(
        course_id=course_id,
        title=course_title,
        shortname=shortname,
        authority=authority,
        target_score=85,
        sections=sections,
    )

    if not preview.topics:
        raise HTTPException(status_code=400, detail="Could not identify syllabus topics for this course.")

    tools = CourseToolsConfig()
    result = await store.create_course_from_confirmed_structure(
        owner_id=owner.owner_id,
        course_id=course_id,
        title=course_title,
        shortname=shortname,
        authority=authority,
        target_score=85,
        topics=preview.topics,
        tools=tools,
        moodle_sections=sections,
    )

    bundle = store.get_course_bundle(course_id, owner_id=owner.owner_id)
    return {"success": True, "topics_count": len(preview.topics), "bundle": bundle}




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
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    if len(raw_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 15 MB limit.")

    try:
        tools = CourseToolsConfig.model_validate_json(tools_json) if tools_json else CourseToolsConfig()
    except Exception:
        tools = CourseToolsConfig()

    extracted_text = extract_text_from_upload(file.filename or "document.txt", raw_bytes)
    store = get_workspace_store()
    result = await store.create_or_ingest_upload(
        owner_id=owner.owner_id,
        title=course_title.strip() or (file.filename or "Study Course"),
        authority=authority.strip() or "custom",
        content_text=extracted_text,
        filename=file.filename or "upload.txt",
        tools=tools,
        course_id=course_id,
        shortname=shortname.strip() or "STUDY",
    )

    await event_bus.publish(
        AcademicEvent(
            type="workspace.synced",
            title=f"Material Imported: {file.filename}",
            message=f"Added topic pack into '{course_title}'.",
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
        "extracted_chars": len(extracted_text),
        **result,
    }


@router.get("/api/workspace/courses/{course_id}")
async def get_workspace_course(
    course_id: int,
    request: Request,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Retrieve complete study workspace bundle owned by the current user."""
    store = get_workspace_store()

    # Auto-check upstream updates on course entry (debounced to 1 min inside store)
    session = get_optional_moodle_session(request)
    client = MoodleClient(base_url=session.get("site_url")) if session and session.get("site_url") else None
    try:
        await store.check_and_apply_course_updates(
            course_id=course_id,
            owner_id=owner.owner_id,
            moodle_client=client,
            session=session,
            force=False,
        )
    except Exception:
        pass

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


@router.post("/api/workspace/courses/{course_id}/check-updates")
async def check_course_updates(
    course_id: int,
    request: Request,
    force: bool = Query(default=False),
    owner: WorkspaceOwner = Depends(get_workspace_owner),
) -> Dict[str, Any]:
    """Explicitly check Moodle upstream for new/updated course materials and map them to weekly syllabus topics."""
    store = get_workspace_store()
    session = get_optional_moodle_session(request)
    client = MoodleClient(base_url=session.get("site_url")) if session and session.get("site_url") else None

    result = await store.check_and_apply_course_updates(
        course_id=course_id,
        owner_id=owner.owner_id,
        moodle_client=client,
        session=session,
        force=force,
    )
    return result


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
