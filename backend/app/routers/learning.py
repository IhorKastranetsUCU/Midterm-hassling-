"""Connect a personal learning provider and prepare one topic deliberately."""
import asyncio
from datetime import datetime, timezone
import json

from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, ConfigDict, Field, SecretStr

from app.core.security import WorkspaceOwner, get_workspace_owner
from app.models.mix import RawTopicSnapshot
from app.services.academic_cache import schedule_background_task
from app.services.course_structure import build_course_map
from app.services.learning_provider import LearningProviderError, LearningSettingsStore, learning_provider_scope, validate_gemini_key
from app.services.mix_generator import split_text_into_semantic_chunks
from app.services.oral_defense_service import MAX_AUDIO_BYTES, evaluate_oral_answer, generate_oral_question, last_oral_attempt
from app.services.topic_flashcards import add_manual_flashcard, expand_topic_flashcards, flashcard_session, review_flashcard
from app.services.topic_quizzes import QuizQuestionInput, add_manual_question, expand_topic_quiz, quiz_catalog
from app.services.workspace_store import get_workspace_store

router = APIRouter(prefix="/api/workspace", tags=["Learning"])


class KeyRequest(BaseModel):
    api_key: SecretStr


# The paper course is a separate namespace for the prototype's three reading topics.
OralCourse = int | Literal["paper"]


class PaperReading(BaseModel):
    course_title: str = Field(min_length=1, max_length=160)
    topic_title: str = Field(min_length=1, max_length=160)
    lecture_context: str = Field(min_length=25, max_length=18000)


def oral_course_id(course: OralCourse) -> int:
    if course == "paper":
        return -1
    if course < 0:
        raise HTTPException(404, "Курс не знайдено.")
    return course


class OralQuestionRequest(BaseModel):
    reading: Optional[PaperReading] = None
    node_id: Optional[str] = None
    previous_questions: List[str] = Field(default_factory=list)
    difficulty: str = "standard"


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


@router.delete("/learning/settings")
async def reset_learning_key(request: Request, response: Response, owner: WorkspaceOwner = Depends(get_workspace_owner)):
    same_origin(request)
    private_response(response)
    settings = LearningSettingsStore(get_workspace_store().db_path)
    settings.delete(owner.owner_id)
    return settings.status(owner.owner_id)


def _archive_mix_version(conn, owner_id: str, mix) -> None:
    conn.execute("""CREATE TABLE IF NOT EXISTS learning_topic_versions (
        owner_id TEXT NOT NULL, mix_id TEXT NOT NULL, saved_at TEXT NOT NULL,
        mix_json TEXT NOT NULL, PRIMARY KEY(owner_id, mix_id, saved_at))""")
    conn.execute("INSERT INTO learning_topic_versions VALUES (?, ?, ?, ?)",
                 (owner_id, mix.mix_id, datetime.now(timezone.utc).isoformat(), mix.model_dump_json()))


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
        chunks, enriched_text = await store.enrich_chunks_with_youtube(
            chunks,
            snapshot_text=snapshot.content_text,
            course_title=bundle["course"].title,
            topic_title=snapshot.title,
        )
        prepared_snapshot = (
            snapshot.model_copy(update={"content_text": enriched_text})
            if enriched_text and enriched_text != snapshot.content_text
            else snapshot
        )
        mix, _, _ = await store._build_topic_mix_cached(
            snapshot=prepared_snapshot, tools=tools, topic_index=topic_index, chunks=chunks,
            existing_notes=previous.user_notes, version=previous.version + 1,
            stable_mix_id=previous.mix_id, materials=previous.materials,
            course_title=bundle["course"].title)
    # Preserve the previous generated version before replacing its current view.
    with store._connect() as conn:
        _archive_mix_version(conn, owner_id, previous)
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


class FlashcardReviewRequest(BaseModel):
    card_id: str = Field(pattern=r"^[a-f0-9]{64}$")
    rating: Literal["again", "hard", "good", "easy"]


class FlashcardInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    front: str = Field(min_length=5, max_length=400)
    back: str = Field(min_length=1, max_length=900)


@router.get("/courses/{course_id}/flashcards")
async def get_course_flashcards(
    course_id: int,
    response: Response,
    topic_index: Optional[int] = None,
    practice_all: bool = False,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    private_response(response)
    return flashcard_session(get_workspace_store(), owner.owner_id, course_id, topic_index, practice_all)


@router.post("/courses/{course_id}/topics/{topic_index}/flashcards")
async def add_topic_flashcards(
    course_id: int,
    topic_index: int,
    request: Request,
    response: Response,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    same_origin(request)
    private_response(response)
    task = schedule_background_task(
        expand_topic_flashcards(get_workspace_store(), owner.owner_id, course_id, topic_index),
        dedup_key=("topic-flashcards", owner.owner_id, course_id, topic_index),
    )
    return await asyncio.shield(task)


@router.post("/courses/{course_id}/topics/{topic_index}/flashcards/review")
async def rate_flashcard(
    course_id: int,
    topic_index: int,
    req: FlashcardReviewRequest,
    request: Request,
    response: Response,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    same_origin(request)
    private_response(response)
    return review_flashcard(get_workspace_store(), owner.owner_id, course_id, topic_index, req.card_id, req.rating)


@router.post("/courses/{course_id}/topics/{topic_index}/flashcards/manual")
async def create_manual_flashcard(
    course_id: int,
    topic_index: int,
    req: FlashcardInput,
    request: Request,
    response: Response,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    same_origin(request)
    private_response(response)
    return add_manual_flashcard(get_workspace_store(), owner.owner_id, course_id, topic_index, req.front, req.back)


@router.get("/courses/{course_id}/quizzes")
async def get_course_quizzes(
    course_id: int,
    response: Response,
    topic_index: Optional[int] = None,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    private_response(response)
    return quiz_catalog(get_workspace_store(), owner.owner_id, course_id, topic_index)


@router.post("/courses/{course_id}/topics/{topic_index}/quizzes")
async def generate_topic_quiz(
    course_id: int,
    topic_index: int,
    request: Request,
    response: Response,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    same_origin(request)
    private_response(response)
    task = schedule_background_task(
        expand_topic_quiz(get_workspace_store(), owner.owner_id, course_id, topic_index),
        dedup_key=("topic-quizzes", owner.owner_id, course_id, topic_index),
    )
    return await asyncio.shield(task)


@router.post("/courses/{course_id}/topics/{topic_index}/quizzes/manual")
async def create_manual_question(
    course_id: int,
    topic_index: int,
    req: QuizQuestionInput,
    request: Request,
    response: Response,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    same_origin(request)
    private_response(response)
    return add_manual_question(get_workspace_store(), owner.owner_id, course_id, topic_index, req)


@router.delete("/courses/{course_id}/topics/{topic_index}/generated")
async def clear_topic_generated(course_id: int, topic_index: int, request: Request, owner: WorkspaceOwner = Depends(get_workspace_owner)):
    """Clear generated book sections, quizzes, and flashcards for one topic while keeping notes and sources."""
    same_origin(request)
    store = get_workspace_store()
    bundle = store.get_course_bundle(course_id, owner.owner_id)
    if not bundle:
        raise HTTPException(404, "Курс не знайдено.")
    previous = next((mix for mix in bundle["topic_mixes"] if mix.topic_index == topic_index), None)
    if not previous:
        raise HTTPException(404, "Тему не знайдено.")
    with store._connect() as conn:
        _archive_mix_version(conn, owner.owner_id, previous)
    cleared = previous.model_copy(
        update={
            "book_sections": [],
            "quizzes": [],
            "flashcards": [],
            "dirty_chunk_ids": [],
            "version": previous.version + 1,
            "updated_at": datetime.now(timezone.utc),
        }
    )
    store._save_topic_mix(cleared, owner.owner_id)
    store._set_exam_mix_stale(owner.owner_id, course_id, True)
    fresh = store.get_course_bundle(course_id, owner.owner_id)
    return {"success": True, "mix_id": cleared.mix_id, "course_map": build_course_map(fresh)}


@router.delete("/courses/{course_id}/generated")
async def clear_course_generated(course_id: int, request: Request, owner: WorkspaceOwner = Depends(get_workspace_owner)):
    """Clear generated AI study content across all topics in a course while preserving notes, sources, and history."""
    same_origin(request)
    store = get_workspace_store()
    bundle = store.get_course_bundle(course_id, owner.owner_id)
    if not bundle:
        raise HTTPException(404, "Курс не знайдено.")
    now = datetime.now(timezone.utc)
    cleared_count = 0
    with store._connect() as conn:
        for previous in bundle["topic_mixes"]:
            if previous.book_sections or previous.quizzes or previous.flashcards:
                _archive_mix_version(conn, owner.owner_id, previous)
                cleared_count += 1
        conn.execute("DELETE FROM exam_mixes WHERE owner_id = ? AND course_id = ?", (owner.owner_id, course_id))
    for previous in bundle["topic_mixes"]:
        if previous.book_sections or previous.quizzes or previous.flashcards:
            cleared = previous.model_copy(
                update={
                    "book_sections": [],
                    "quizzes": [],
                    "flashcards": [],
                    "dirty_chunk_ids": [],
                    "version": previous.version + 1,
                    "updated_at": now,
                }
            )
            store._save_topic_mix(cleared, owner.owner_id)
    store._set_exam_mix_stale(owner.owner_id, course_id, False)
    fresh = store.get_course_bundle(course_id, owner.owner_id)
    return {"success": True, "cleared_topics": cleared_count, "course_map": build_course_map(fresh)}


@router.post("/courses/{course_id}/topics/{topic_index}/oral-defense/question")
async def oral_defense_question(
    course_id: OralCourse,
    topic_index: int,
    req: OralQuestionRequest,
    request: Request,
    response: Response,
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    same_origin(request)
    private_response(response)
    store = get_workspace_store()
    provider = LearningSettingsStore(store.db_path).get(owner.owner_id)
    if not provider:
        raise LearningProviderError("Підключи Gemini API key, щоб розпочати усний захист.", 424)
    with learning_provider_scope(provider):
        reading = None
        if course_id == "paper":
            if req.reading is None or topic_index not in (1, 2, 3):
                raise HTTPException(422, "Обери тему з навчальними матеріалами.")
            reading = {**req.reading.model_dump(), "source_names": [req.reading.topic_title]}
        return await generate_oral_question(
            store=store,
            owner_id=owner.owner_id,
            course_id=oral_course_id(course_id),
            topic_index=topic_index,
            node_id=req.node_id,
            previous_questions=req.previous_questions,
            difficulty=req.difficulty,
            reading=reading,
        )


@router.post("/courses/{course_id}/topics/{topic_index}/oral-defense/evaluate")
async def oral_defense_evaluate(
    course_id: OralCourse,
    topic_index: int,
    request: Request,
    response: Response,
    question_id: str = Form(...),
    transcript: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    owner: WorkspaceOwner = Depends(get_workspace_owner),
):
    same_origin(request)
    private_response(response)
    store = get_workspace_store()
    provider = LearningSettingsStore(store.db_path).get(owner.owner_id)
    if not provider:
        raise LearningProviderError("Підключи Gemini API key, щоб перевірити відповідь.", 424)

    audio_bytes: Optional[bytes] = None
    audio_mime: Optional[str] = None
    if audio is not None:
        audio_bytes = await audio.read(MAX_AUDIO_BYTES + 1)
        if len(audio_bytes) > MAX_AUDIO_BYTES:
            raise HTTPException(413, "Аудіозапис завеликий (максимум 15 МБ).")
        audio_mime = audio.content_type

    with learning_provider_scope(provider):
        return await evaluate_oral_answer(
            store=store,
            owner_id=owner.owner_id,
            course_id=oral_course_id(course_id),
            topic_index=topic_index,
            question_id=question_id,
            audio_bytes=audio_bytes,
            audio_mime=audio_mime,
            transcript=transcript,
        )


@router.get("/courses/{course_id}/topics/{topic_index}/oral-defense/latest")
async def latest_oral_defense(course_id: OralCourse, topic_index: int, response: Response,
                              node_id: Optional[str] = None, owner: WorkspaceOwner = Depends(get_workspace_owner)):
    private_response(response)
    return {"attempt": last_oral_attempt(get_workspace_store().db_path, owner.owner_id,
                                         oral_course_id(course_id), topic_index, node_id)}
