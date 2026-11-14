import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.events import AcademicEvent, event_bus
from app.models.mix import (
    CourseToolsConfig,
    ExtensionSyncPayload,
    WorkspaceCourseSummary,
)
from app.services.mix_generator import extract_text_from_upload
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


@router.post("/api/sync/extension")
async def sync_from_extension(payload: ExtensionSyncPayload) -> Dict[str, Any]:
    """
    Ingest Moodle course sections & diffs pushed from the Chrome/Edge Extension.
    Runs the fail-closed exam safety policy filter before persisting or indexing anything.
    """
    store = get_workspace_store()
    result = await store.sync_extension_payload(payload)

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
        "summary": result,
    }


@router.get("/api/workspace/courses", response_model=List[WorkspaceCourseSummary])
async def list_workspace_courses() -> List[WorkspaceCourseSummary]:
    """List all courses synced from the Chrome Extension or imported manually via files."""
    store = get_workspace_store()
    return store.list_courses()


@router.post("/api/workspace/courses/create-text")
async def create_or_append_text_course(req: ManualCourseTextRequest) -> Dict[str, Any]:
    """Create a standalone course workspace (or add a topic) from pasted notes/text + tool checkboxes."""
    if not req.content_text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Study material text cannot be empty.")

    store = get_workspace_store()
    tools = req.tools_config or CourseToolsConfig()
    result = await store.create_or_ingest_upload(
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
            data={"course_id": result["course_id"], "authority": result["authority"]},
        )
    )

    return {
        "success": True,
        "workspace_url": f"/{result['authority']}/courses/{result['course_id']}",
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
            data={"course_id": result["course_id"], "authority": result["authority"]},
        )
    )

    return {
        "success": True,
        "workspace_url": f"/{result['authority']}/courses/{result['course_id']}",
        "extracted_chars": len(extracted_text),
        **result,
    }


@router.get("/api/workspace/courses/{course_id}")
async def get_workspace_course(course_id: int) -> Dict[str, Any]:
    """Retrieve complete study workspace bundle (TopicMixes, ExamMix, tool config, exam audit)."""
    store = get_workspace_store()
    bundle = store.get_course_bundle(course_id)
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


@router.put("/api/workspace/courses/{course_id}/tools")
async def update_course_tools(course_id: int, tools: CourseToolsConfig) -> Dict[str, Any]:
    """Update enabled study tools checkboxes for a course and refresh generated mixes."""
    store = get_workspace_store()
    if not store.update_tools_config(course_id, tools):
        raise HTTPException(status_code=404, detail=f"Workspace course {course_id} not found.")
    mixes = await store.regenerate_course_mixes(course_id) or []
    exam_mix = await store.build_exam_mix(course_id) if tools.exam_mix else None
    return {
        "success": True,
        "tools_config": tools.model_dump(),
        "topic_count": len(mixes),
        "has_exam_mix": exam_mix is not None,
    }


@router.post("/api/workspace/courses/{course_id}/generate")
async def regenerate_course_mixes(course_id: int) -> Dict[str, Any]:
    """Re-run MixGenerator across all safe topic snapshots in this course."""
    store = get_workspace_store()
    mixes = await store.regenerate_course_mixes(course_id)
    if mixes is None:
        raise HTTPException(status_code=404, detail=f"Workspace course {course_id} not found.")
    return {
        "success": True,
        "topic_mixes": [m.model_dump(mode="json") for m in mixes],
    }


@router.post("/api/workspace/courses/{course_id}/exam-mix")
async def build_course_exam_mix(course_id: int) -> Dict[str, Any]:
    """Synthesize Level 2 ExamMix ('Mix of Mixes') from TopicMix summaries."""
    store = get_workspace_store()
    exam_mix = await store.build_exam_mix(course_id)
    if not exam_mix:
        raise HTTPException(
            status_code=404,
            detail=f"Cannot build Exam Mix: course {course_id} has no synced topics yet.",
        )
    return {
        "success": True,
        "exam_mix": exam_mix.model_dump(mode="json"),
    }


@router.patch("/api/workspace/mixes/{mix_id}/notes")
async def save_mix_notes(mix_id: str, req: NotesUpdateRequest) -> Dict[str, Any]:
    """Persist student's personal notes on a TopicMix without touching upstream source."""
    store = get_workspace_store()
    updated = store.save_mix_notes(mix_id, req.notes)
    if not updated:
        raise HTTPException(status_code=404, detail=f"TopicMix '{mix_id}' not found.")
    return {"success": True, "mix_id": updated.mix_id, "user_notes": updated.user_notes}


@router.post("/api/workspace/mixes/{mix_id}/ack-update")
async def apply_upstream_mix_update(mix_id: str) -> Dict[str, Any]:
    """Refresh TopicMix from newly synced Moodle snapshot while preserving personal user_notes."""
    store = get_workspace_store()
    updated = await store.acknowledge_mix_update(mix_id)
    if not updated:
        raise HTTPException(status_code=404, detail=f"TopicMix '{mix_id}' not found.")
    return {"success": True, "mix": updated.model_dump(mode="json")}


@router.delete("/api/workspace/courses/{course_id}")
async def delete_workspace_course(course_id: int) -> Dict[str, Any]:
    """Delete a private course workspace and all associated snapshots/mixes."""
    store = get_workspace_store()
    if not store.delete_course(course_id):
        raise HTTPException(status_code=404, detail=f"Workspace course {course_id} not found.")
    return {"success": True, "deleted_course_id": course_id}
