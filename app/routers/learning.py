"""Connect a personal learning provider and prepare one topic deliberately."""
import asyncio
from datetime import datetime, timezone
import json

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, SecretStr

from app.core.security import WorkspaceOwner, get_workspace_owner
from app.models.mix import RawTopicSnapshot
from app.services.academic_cache import schedule_background_task
from app.services.course_structure import build_course_map
from app.services.learning_provider import LearningProviderError, LearningSettingsStore, learning_provider_scope, validate_gemini_key
from app.services.mix_generator import split_text_into_semantic_chunks
from app.services.workspace_store import get_workspace_store

router = APIRouter(prefix="/api/workspace", tags=["Learning"])


class KeyRequest(BaseModel):
    api_key: SecretStr


def private_response(response):
    response.headers["Cache-Control"] = "no-store"


def same_origin(request):
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") != str(request.base_url).rstrip("/"):
        raise HTTPException(403, "Відкрий налаштування безпосередньо у Hustle.")


@router.get("/learning/settings")
async def learning_settings(response: Response, owner: WorkspaceOwner = Depends(get_workspace_owner)):
    private_response(response)
    return LearningSettingsStore(get_workspace_store().db_path).status(owner.owner_id)


@router.put("/learning/settings")
async def connect_learning(req: KeyRequest, request: Request, response: Response, owner: WorkspaceOwner = Depends(get_workspace_owner)):
    same_origin(request)
    private_response(response)
    key = req.api_key.get_secret_value().strip()
    model = await validate_gemini_key(key)
    settings = LearningSettingsStore(get_workspace_store().db_path)
    settings.save(owner.owner_id, key, model)
    return settings.status(owner.owner_id)


async def prepare_topic(store, owner_id, course_id, topic_index, provider):
    bundle = store.get_course_bundle(course_id, owner_id)
    if not bundle:
        raise HTTPException(404, "Курс не знайдено.")
    previous = next((mix for mix in bundle["topic_mixes"] if mix.topic_index == topic_index), None)
    if not previous:
        raise HTTPException(404, "Додай матеріали до цієї теми.")
    with store._connect() as conn:
        row = conn.execute("SELECT * FROM topic_snapshots WHERE owner_id=? AND course_id=? AND topic_index=?",
                           (owner_id, course_id, topic_index)).fetchone()
    if not row or row["safety_status"] == "restricted_exam" or not row["content_text"].strip():
        raise HTTPException(422, "У темі ще немає навчального тексту. Додай лекцію або конспект.")
    snapshot = RawTopicSnapshot(**{key: row[key] for key in (
        "source_id", "course_id", "authority", "title", "content_text", "source_type", "source_hash", "safety_status", "visibility")})
    chunks = store._load_topic_chunks(owner_id, course_id, topic_index)
    if not chunks:
        chunks = [{**chunk, "module_hash": chunk["content_hash"], "safety_status": snapshot.safety_status}
                  for chunk in split_text_into_semantic_chunks(snapshot.title, snapshot.content_text)]
    tools = previous.tools_enabled.model_copy(update={"interactive_book": True, "flashcards": True, "practice_quizzes": True})
    with learning_provider_scope(provider):
        mix, _, _ = await store._build_topic_mix_cached(
            snapshot=snapshot, tools=tools, topic_index=topic_index, chunks=chunks,
            existing_notes=previous.user_notes, version=previous.version + 1,
            stable_mix_id=previous.mix_id, materials=previous.materials)
    # Preserve the previous generated version before replacing its current view.
    with store._connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS learning_topic_versions (
            owner_id TEXT NOT NULL, mix_id TEXT NOT NULL, saved_at TEXT NOT NULL,
            mix_json TEXT NOT NULL, PRIMARY KEY(owner_id, mix_id, saved_at))""")
        conn.execute("INSERT INTO learning_topic_versions VALUES (?, ?, ?, ?)",
                     (owner_id, previous.mix_id, datetime.now(timezone.utc).isoformat(), previous.model_dump_json()))
    # Do not accept an obsolete generation if the source changed during the API call.
    current = store.get_course_bundle(course_id, owner_id)
    latest = next((item for item in current["topic_mixes"] if item.mix_id == previous.mix_id), None) if current else None
    if not latest or latest.source_hash != previous.source_hash:
        raise HTTPException(409, "Матеріали теми змінилися. Онови сторінку та підготуй тему ще раз.")
    mix.has_upstream_update = latest.has_upstream_update
    mix.dirty_chunk_ids = latest.dirty_chunk_ids
    store._save_topic_mix(mix, owner_id)
    course_tools = bundle["tools_config"].copy()
    course_tools.update(interactive_book=True, flashcards=True, practice_quizzes=True)
    from app.models.mix import CourseToolsConfig
    store.update_tools_config(course_id, CourseToolsConfig.model_validate(course_tools), owner_id)
    store._set_exam_mix_stale(owner_id, course_id, True)
    fresh = store.get_course_bundle(course_id, owner_id)
    return {"success": True, "mix_id": mix.mix_id, "course_map": build_course_map(fresh)}


@router.post("/courses/{course_id}/topics/{topic_index}/prepare-learning")
async def prepare_learning(course_id: int, topic_index: int, request: Request, owner: WorkspaceOwner = Depends(get_workspace_owner)):
    same_origin(request)
    store = get_workspace_store()
    provider = LearningSettingsStore(store.db_path).get(owner.owner_id)
    if not provider:
        raise LearningProviderError("Підключи Gemini API key, щоб підготувати тему.", 424)
    task = schedule_background_task(prepare_topic(store, owner.owner_id, course_id, topic_index, provider),
                                    dedup_key=("prepare-learning", owner.owner_id, course_id, topic_index))
    return await asyncio.shield(task)
