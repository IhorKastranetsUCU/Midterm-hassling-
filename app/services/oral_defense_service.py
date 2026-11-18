"""Live Oral Defense service: lecture-grounded question generation and multimodal voice evaluation."""
import base64
import json
import logging
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from app.services.gemini_service import GeminiService
from app.services.learning_provider import LearningProviderError

logger = logging.getLogger("oral_defense")

MAX_AUDIO_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_AUDIO_MIMES = {
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/aac",
    "audio/flac",
    "audio/x-m4a",
}
BOILERPLATE_RE = re.compile(
    r"This interactive unit organizes material from|Опрацювання матеріалу з \*\*"
)


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_json_object(raw_text: Optional[str]) -> Dict[str, Any]:
    if not raw_text or not raw_text.strip():
        raise LearningProviderError("Gemini не повернув відповідь. Спробуй ще раз.")
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass
    raise LearningProviderError("Gemini повернув некоректний формат відповіді. Спробуй ще раз.")


def _normalize_audio_mime(mime: Optional[str]) -> str:
    base = (mime or "audio/webm").split(";")[0].strip().lower()
    if base == "audio/x-m4a":
        return "audio/mp4"
    if base == "audio/x-wav":
        return "audio/wav"
    if base in ALLOWED_AUDIO_MIMES:
        return base
    if base.startswith("video/webm"):
        return "audio/webm"
    return "audio/webm"


def _ensure_tables(db_path: str) -> None:
    with sqlite3.connect(db_path, timeout=5) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS oral_defense_sessions (
                question_id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                course_id INTEGER NOT NULL,
                topic_index INTEGER NOT NULL,
                topic_title TEXT NOT NULL,
                question_text TEXT NOT NULL,
                expected_key_points_json TEXT NOT NULL DEFAULT '[]',
                source_hint TEXT NOT NULL DEFAULT '',
                lecture_context TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_oral_defense_owner_topic
                ON oral_defense_sessions (owner_id, course_id, topic_index, created_at);

            CREATE TABLE IF NOT EXISTS oral_defense_attempts (
                attempt_id TEXT PRIMARY KEY,
                question_id TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                course_id INTEGER NOT NULL,
                topic_index INTEGER NOT NULL,
                user_transcript TEXT NOT NULL,
                verdict TEXT NOT NULL,
                feedback_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


def _strip_html(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw or "")
    return re.sub(r"\s+", " ", text).strip()


def extract_topic_lecture_context(
    store: Any,
    owner_id: str,
    course_id: int,
    topic_index: int,
    node_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Gather all non-exam lecture materials, transcripts, notes, and textbook sections for a topic."""
    from app.services.course_structure import build_course_map

    bundle = store.get_course_bundle(course_id, owner_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="Курс не знайдено.")

    course_obj = bundle["course"]
    course_title = (course_obj.get("title") if isinstance(course_obj, dict) else getattr(course_obj, "title", None)) or f"Курс #{course_id}"
    course_map = bundle.get("course_map") or build_course_map(bundle) or {}
    nodes = course_map.get("nodes") or []

    node = None
    if node_id:
        node = next((n for n in nodes if n.get("id") == node_id), None)
    if not node:
        node = next(
            (n for n in nodes if n.get("topic_index") == topic_index and n.get("learnable")),
            None,
        ) or next((n for n in nodes if n.get("topic_index") == topic_index), None)

    mix = None
    target_mix_id = node.get("mix_id") if node else None
    for m in bundle.get("topic_mixes") or []:
        if target_mix_id and m.mix_id == target_mix_id:
            mix = m
            break
    if not mix:
        mix = next((m for m in (bundle.get("topic_mixes") or []) if m.topic_index == topic_index), None)

    topic_title = (
        (node.get("title") if node else None)
        or (mix.title if mix else None)
        or f"Тема {topic_index}"
    )

    chunks: List[str] = []
    source_names: List[str] = []

    with store._connect() as conn:
        snap = conn.execute(
            "SELECT title, content_text, safety_status FROM topic_snapshots WHERE owner_id=? AND course_id=? AND topic_index=?",
            (owner_id, course_id, topic_index),
        ).fetchone()
        if snap:
            if snap["safety_status"] == "restricted_exam":
                raise HTTPException(
                    status_code=403,
                    detail="Матеріали контрольного оцінювання захищені від AI.",
                )
            if snap["content_text"] and snap["content_text"].strip():
                chunks.append(f"=== Загальний матеріал теми ({snap['title']}) ===\n{snap['content_text'].strip()}")

    if node:
        if node.get("summary_markdown"):
            chunks.append(f"=== Короткий огляд теми ===\n{node['summary_markdown']}")
        elif node.get("summary") and node.get("summary") != topic_title:
            chunks.append(f"=== Опис теми ===\n{node['summary']}")

        for sec in node.get("book_sections") or []:
            exp = sec.get("explanation_markdown") or ""
            if exp and not BOILERPLATE_RE.search(exp):
                heading = sec.get("heading") or "Розділ"
                takeaways = "\n".join(f"- {t}" for t in (sec.get("key_takeaways") or []))
                chunks.append(f"=== Конспект: {heading} ===\n{exp}\n{takeaways}")

        for mat in node.get("materials") or []:
            if mat.get("safety_status") == "restricted_exam" or mat.get("is_locked"):
                continue
            m_name = mat.get("name") or "Матеріал"
            m_parts = []
            for field_name in ("transcript_snippet", "content_text", "text_excerpt", "description"):
                val = mat.get(field_name)
                if val and str(val).strip():
                    m_parts.append(_strip_html(str(val)))
            if mat.get("key_items"):
                m_parts.append("Ключові тези: " + "; ".join(str(x) for x in mat["key_items"]))
            if m_parts:
                source_names.append(m_name)
                chunks.append(f"=== Матеріал Moodle: {m_name} ===\n" + "\n".join(m_parts))

    if mix:
        textbook_md = getattr(mix, "textbook_markdown", None)
        if textbook_md and not BOILERPLATE_RE.search(textbook_md):
            chunks.append(f"=== Підручник теми ===\n{textbook_md}")
        for sec in getattr(mix, "book_sections", None) or []:
            exp = getattr(sec, "explanation_markdown", None) or ""
            if exp and not BOILERPLATE_RE.search(exp):
                takeaways = "\n".join(f"- {t}" for t in (getattr(sec, "key_takeaways", None) or []))
                chunks.append(f"=== Розділ конспекту: {sec.heading} ===\n{exp}\n{takeaways}")
        for mat in getattr(mix, "materials", None) or []:
            if getattr(mat, "safety_status", None) == "restricted_exam" or getattr(mat, "is_locked", False):
                continue
            m_parts = []
            for field_name in ("transcript_snippet", "content_text", "description"):
                val = getattr(mat, field_name, None)
                if val and str(val).strip():
                    m_parts.append(_strip_html(str(val)))
            k_items = getattr(mat, "key_items", None)
            if k_items:
                m_parts.append("Ключові тези: " + "; ".join(k_items))
            if m_parts:
                source_names.append(mat.name)
                chunks.append(f"=== Лекційний матеріал: {mat.name} ===\n" + "\n".join(m_parts))
        u_notes = getattr(mix, "user_notes", None)
        if u_notes and u_notes.strip():
            chunks.append(f"=== Особисті нотатки студента ===\n{u_notes.strip()}")

    # Also check persisted topic markdown file if present
    md_path = os.path.join("data", "textbooks", str(course_id), f"topic_{topic_index}.md")
    if os.path.exists(md_path):
        try:
            with open(md_path, "r", encoding="utf-8") as fh:
                md_body = fh.read().strip()
            if md_body and not BOILERPLATE_RE.search(md_body):
                chunks.append(f"=== Збережений конспект (.md) ===\n{md_body}")
        except OSError:
            pass

    # Deduplicate and bound context length
    deduped: List[str] = []
    seen_prefixes = set()
    for chunk in chunks:
        norm = re.sub(r"\s+", " ", chunk)[:180]
        if norm and norm not in seen_prefixes:
            seen_prefixes.add(norm)
            deduped.append(chunk)

    combined = "\n\n".join(deduped).strip()
    if len(combined) < 25:
        raise HTTPException(
            status_code=422,
            detail="У цій темі ще немає достатнього лекційного матеріалу для усного захисту. Додай конспект, файл лекції або синхронізуй курс.",
        )

    return {
        "course_title": course_title,
        "topic_index": topic_index,
        "topic_title": topic_title,
        "source_names": list(dict.fromkeys(source_names))[:10],
        "lecture_context": combined[:18000],
    }


async def generate_oral_question(
    store: Any,
    owner_id: str,
    course_id: int,
    topic_index: int,
    node_id: Optional[str] = None,
    previous_questions: Optional[List[str]] = None,
    difficulty: str = "standard",
) -> Dict[str, Any]:
    """Generate a live spoken oral-defense question strictly grounded in the topic's lecture materials."""
    _ensure_tables(store.db_path)
    ctx = extract_topic_lecture_context(store, owner_id, course_id, topic_index, node_id=node_id)

    prev_list = [q.strip() for q in (previous_questions or []) if q and q.strip()][-8:]
    prev_block = (
        "\nРаніше вже задані питання (НЕ повторюй їх, обери інший аспект лекції):\n"
        + "\n".join(f"- {q}" for q in prev_list)
        if prev_list
        else ""
    )

    difficulty_note = (
        "Задай глибоке аналітичне або концептуальне запитання на розуміння доведень, граничних випадків та взаємозв'язків."
        if difficulty == "deep"
        else "Задай чітке, змістовне екзаменаційне запитання на розуміння ключової концепції, означення або механізму з лекції."
    )

    system_instruction = (
        "Ти — доброзичливий, але вимогливий викладач університету, який проводить живий усний захист (Oral Defense) по лекції.\n"
        "Твоє завдання — сформулювати ОДНЕ усне запитання виключно за наданим матеріалом лекції.\n"
        "Правила:\n"
        "1. Запитання повинно звучати природно для озвучення вголос: 1–3 речення, БЕЗ символів розмітки Markdown (без **, #, `, $).\n"
        "2. Мова запитання: українська (або англійська, якщо весь лекційний матеріал виключно англійською та термінологія краще звучить англійською — переважно українська).\n"
        "3. Не питай організаційні речі (дедлайни, оцінювання, посилання на Zoom).\n"
        "4. Поверни строго JSON-об'єкт."
    )

    prompt = (
        f"Курс: {ctx['course_title']}\n"
        f"Тема: {ctx['topic_title']}\n"
        f"{difficulty_note}\n"
        f"{prev_block}\n\n"
        f"МАТЕРІАЛИ ЛЕКЦІЇ:\n{ctx['lecture_context']}\n\n"
        "Поверни JSON зі структурою:\n"
        "{\n"
        '  "question_text": "Природно сформульоване усне питання до студента (без markdown і $).",\n'
        '  "language": "uk-UA або en-US",\n'
        '  "expected_key_points": ["ключовий пункт 1, який має згадати студент", "ключовий пункт 2", "ключовий пункт 3"],\n'
        '  "source_hint": "Коротка вказівка на розділ або матеріал лекції"\n'
        "}"
    )

    gemini = GeminiService()
    raw = await gemini.generate_content(
        prompt=prompt,
        system_instruction=system_instruction,
        json_mode=True,
        temperature=0.45,
        timeout=35.0,
        raise_on_error=True,
    )
    parsed = _parse_json_object(raw)

    question_text = str(parsed.get("question_text") or "").strip()
    if not question_text:
        raise LearningProviderError("Gemini не зміг сформувати запитання за цією темою. Спробуй ще раз.")

    language = str(parsed.get("language") or "").strip()
    if language not in {"uk-UA", "en-US"}:
        language = "uk-UA" if re.search(r"[а-яА-ЯіІїЇєЄґҐ]", question_text) else "en-US"

    expected = [str(x).strip() for x in (parsed.get("expected_key_points") or []) if str(x).strip()][:6]
    source_hint = str(parsed.get("source_hint") or "").strip()

    question_id = f"od-{uuid.uuid4().hex[:12]}"
    created_at = _utc_iso()

    with sqlite3.connect(store.db_path, timeout=5) as conn:
        conn.execute(
            """
            INSERT INTO oral_defense_sessions (
                question_id, owner_id, course_id, topic_index, topic_title,
                question_text, expected_key_points_json, source_hint, lecture_context, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                question_id,
                owner_id,
                course_id,
                topic_index,
                ctx["topic_title"],
                question_text,
                json.dumps(expected, ensure_ascii=False),
                source_hint,
                ctx["lecture_context"],
                created_at,
            ),
        )

    return {
        "question_id": question_id,
        "topic_index": topic_index,
        "topic_title": ctx["topic_title"],
        "question_text": question_text,
        "language": language,
        "source_hint": source_hint,
        "expected_key_points_count": len(expected),
        "sources": ctx["source_names"],
    }


async def evaluate_oral_answer(
    store: Any,
    owner_id: str,
    course_id: int,
    topic_index: int,
    question_id: str,
    audio_bytes: Optional[bytes] = None,
    audio_mime: Optional[str] = None,
    transcript: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluate a student's spoken (audio) or transcribed oral-defense answer via Gemini multimodal API.
    Identifies what was right, what was factually wrong, and what key lecture details were missed.
    """
    _ensure_tables(store.db_path)

    with sqlite3.connect(store.db_path, timeout=5) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            """
            SELECT * FROM oral_defense_sessions
            WHERE question_id = ? AND owner_id = ? AND course_id = ?
            """,
            (question_id, owner_id, course_id),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Питання усного захисту не знайдено. Почни нове питання.")

    typed_transcript = (transcript or "").strip()
    has_audio = bool(audio_bytes and len(audio_bytes) >= 250)
    if audio_bytes and len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Аудіозапис занадто великий (максимум 15 МБ).")

    if not has_audio and not typed_transcript:
        raise HTTPException(
            status_code=422,
            detail="Не вдалося зафіксувати відповідь. Натисни мікрофон, промов відповідь і зупини запис.",
        )

    expected_points = json.loads(row["expected_key_points_json"] or "[]")
    expected_block = "\n".join(f"- {pt}" for pt in expected_points)

    system_instruction = (
        "Ти — досвідчений викладач університету, який оцінює усну відповідь студента на захисті матеріалу.\n"
        "Твоє завдання:\n"
        "1. Якщо додано аудіозапис — уважно прослухай мовлення студента і точно розшифруй його у поле user_transcript.\n"
        "   Якщо аудіо тихе, порожнє або нерозбірливе і немає текстової відповіді, чесно постав verdict='inaudible' та повідом про це.\n"
        "2. Порівняй відповідь студента з текстом лекції та очікуваними ключовими пунктами.\n"
        "3. Чітко вкажи:\n"
        "   - Що сказано ПРАВИЛЬНО (what_was_correct).\n"
        "   - Що було сказано НЕПРАВИЛЬНО / неточно (what_was_wrong — конкретна хибна теза студента та правильне пояснення з лекції).\n"
        "   - Що було ПРОПУЩЕНО (what_was_missed — важливі умови, означення, формули або аргументи з лекції, про які студент не сказав).\n"
        "4. Напиши живу, зрозумілу, конструктивну текстову відповідь українською мовою (detailed_feedback).\n"
        "Поверни строго JSON-об'єкт."
    )

    hint_line = (
        f"\nПопередній браузерний підпис мовлення (може містити помилки розпізнавання, орієнтуйся передусім на аудіо): «{typed_transcript}»\n"
        if has_audio and typed_transcript
        else (f"\nТекстова відповідь студента: «{typed_transcript}»\n" if typed_transcript else "")
    )

    prompt = (
        f"Тема: {row['topic_title']}\n"
        f"Питання екзаменатора: «{row['question_text']}»\n\n"
        f"Очікувані ключові пункти з лекції:\n{expected_block}\n\n"
        f"КОНТЕКСТ ЛЕКЦІЇ:\n{row['lecture_context'][:14000]}\n"
        f"{hint_line}\n"
        "Поверни JSON зі структурою:\n"
        "{\n"
        '  "user_transcript": "Точна розшифровка того, що сказав студент",\n'
        '  "verdict": "excellent | good | partial | needs_review | inaudible",\n'
        '  "verdict_label": "Короткий статус українською (напр. Повна відповідь / Добре, але є прогалини / Є неточності / Потребує повторення)",\n'
        '  "what_was_correct": ["що студент пояснив правильно"],\n'
        '  "what_was_wrong": [{"said": "що сказано неправильно або неточно", "correction": "як правильно за лекцією"}],\n'
        '  "what_was_missed": ["який важливий пункт з лекції було пропущено"],\n'
        '  "detailed_feedback": "Розгорнута текстова відповідь викладача студенту з аналізом того, що не так і що варто додати.",\n'
        '  "ideal_answer": "Стисла зразкова відповідь за матеріалами лекції"\n'
        "}"
    )

    parts: List[Dict[str, Any]] = []
    if has_audio and audio_bytes is not None:
        clean_mime = _normalize_audio_mime(audio_mime)
        parts.append(
            {
                "inlineData": {
                    "mimeType": clean_mime,
                    "data": base64.b64encode(audio_bytes).decode("ascii"),
                }
            }
        )
    parts.append({"text": prompt})

    gemini = GeminiService()
    raw = await gemini.generate_content(
        prompt="",
        parts=parts,
        system_instruction=system_instruction,
        json_mode=True,
        temperature=0.2,
        timeout=50.0,
        raise_on_error=True,
    )
    parsed = _parse_json_object(raw)

    verdict = str(parsed.get("verdict") or "partial").strip().lower()
    if verdict not in {"excellent", "good", "partial", "needs_review", "inaudible"}:
        verdict = "partial"

    user_transcript = str(parsed.get("user_transcript") or typed_transcript or "").strip()

    wrong_items: List[Dict[str, str]] = []
    for item in parsed.get("what_was_wrong") or []:
        if isinstance(item, dict):
            said = str(item.get("said") or item.get("error") or "").strip()
            corr = str(item.get("correction") or item.get("fix") or "").strip()
            if said or corr:
                wrong_items.append({"said": said, "correction": corr})
        elif str(item).strip():
            wrong_items.append({"said": str(item).strip(), "correction": ""})

    result = {
        "question_id": question_id,
        "topic_index": row["topic_index"],
        "topic_title": row["topic_title"],
        "question_text": row["question_text"],
        "user_transcript": user_transcript,
        "verdict": verdict,
        "verdict_label": str(parsed.get("verdict_label") or "Результат аналізу").strip(),
        "what_was_correct": [str(x).strip() for x in (parsed.get("what_was_correct") or []) if str(x).strip()],
        "what_was_wrong": wrong_items,
        "what_was_missed": [str(x).strip() for x in (parsed.get("what_was_missed") or []) if str(x).strip()],
        "detailed_feedback": str(parsed.get("detailed_feedback") or "").strip(),
        "ideal_answer": str(parsed.get("ideal_answer") or "").strip(),
    }

    with sqlite3.connect(store.db_path, timeout=5) as conn:
        conn.execute(
            """
            INSERT INTO oral_defense_attempts (
                attempt_id, question_id, owner_id, course_id, topic_index,
                user_transcript, verdict, feedback_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"oda-{uuid.uuid4().hex[:12]}",
                question_id,
                owner_id,
                course_id,
                row["topic_index"],
                user_transcript,
                verdict,
                json.dumps(result, ensure_ascii=False),
                _utc_iso(),
            ),
        )

    return result
