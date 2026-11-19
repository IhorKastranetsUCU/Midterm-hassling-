"""Topic decks assembled from saved course cards and new, sourced questions."""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from hashlib import sha256

from fastapi import HTTPException

from app.services.flashcard_prompt import (
    FLASHCARD_BATCH_SIZE, FLASHCARD_INSTRUCTIONS,
    build_flashcard_prompt, front_key, is_study_card, parse_flashcards,
)
from app.services.gemini_service import GeminiService
from app.services.learning_provider import LearningProviderError, LearningSettingsStore, learning_provider_scope
from app.services.study_topics import study_course, study_topics, topic_sources


RATINGS = {
    "again": ("Знову", "10 хв", timedelta(minutes=10)),
    "hard": ("Важко", "12 год", timedelta(hours=12)),
    "good": ("Добре", "1 день", timedelta(days=1)),
    "easy": ("Легко", "4 дні", timedelta(days=4)),
}
ROUND_SIZE = 20


def _id(front):
    return sha256(front_key(front).encode()).hexdigest()


def _cards(bundle, rows):
    by_topic = defaultdict(dict)
    for mix in bundle["topic_mixes"]:
        for card in mix.flashcards:
            if is_study_card(card.front, card.back):
                card_id = _id(card.front)
                by_topic[mix.topic_index].setdefault(card_id, {
                    "card_id": card_id, "front": card.front, "back": card.back,
                    "source_citation": None, "next_review_at": None,
                })
    for row in rows:
        cards = by_topic[row["topic_index"]]
        card = cards.setdefault(row["card_id"], dict(row))
        card["next_review_at"] = row["next_review_at"]
    return by_topic


def _saved_cards(conn, owner_id, course_id, topic_index=None):
    columns = "topic_index, card_id, front, back, source_citation, next_review_at"
    query = f"SELECT {columns} FROM workspace_flashcards WHERE owner_id=? AND course_id=?"
    if topic_index is None:
        return conn.execute(query + " ORDER BY rowid", (owner_id, course_id)).fetchall()
    return conn.execute(query + " AND topic_index=? ORDER BY rowid", (owner_id, course_id, topic_index)).fetchall()


def _is_due(card, current):
    return not card["next_review_at"] or card["next_review_at"] <= current


def _relative_time(delta):
    minutes = max(1, round(delta.total_seconds() / 60))
    if minutes < 60:
        return f"{minutes} хв"
    if minutes < 24 * 60:
        return f"{max(1, round(minutes / 60))} год"
    return f"{max(1, round(minutes / 1440))} дн."


def flashcard_session(store, owner_id, course_id, topic_index=None, practice_all=False):
    bundle = study_course(store, owner_id, course_id)
    topics = study_topics(bundle)
    if topic_index is not None and topic_index not in topics:
        raise HTTPException(404, "Тему не знайдено в цьому курсі.")

    with store._connect() as conn:
        by_topic = _cards(bundle, _saved_cards(conn, owner_id, course_id))
        source_indices = {index for index in topics if topic_sources(conn, owner_id, course_id, index)}
    now = datetime.now(timezone.utc)
    current = now.isoformat()
    catalog = []
    queue = []
    for index, topic in topics.items():
        cards = list(by_topic[index].values())
        due = [card for card in cards if _is_due(card, current)]
        future = sorted(
            (card for card in cards if not _is_due(card, current)),
            key=lambda card: card["next_review_at"],
        )
        next_due = future[0]["next_review_at"] if future else None
        catalog.append({
            **topic, "topic_index": index, "cards_count": len(cards), "due_count": len(due),
            "has_source": index in source_indices,
            "next_due_in": _relative_time(datetime.fromisoformat(next_due) - now) if next_due else None,
        })
        if index == topic_index:
            due.sort(key=lambda card: (card["next_review_at"] is None, card["next_review_at"] or ""))
            queue = (due + future if practice_all else due)[:ROUND_SIZE]
    return {
        "topics": catalog, "queue": queue, "practice_all": practice_all,
        "ratings": [{"id": key, "label": label, "interval": interval}
                    for key, (label, interval, _) in RATINGS.items()],
    }


def _save_card(conn, owner_id, course_id, topic_index, front, back, source_citation=None):
    return conn.execute(
        """INSERT INTO workspace_flashcards (
            owner_id, course_id, topic_index, card_id, front, back, source_citation
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(owner_id, course_id, topic_index, card_id) DO NOTHING""",
        (owner_id, course_id, topic_index, _id(front), front, back, source_citation),
    ).rowcount


def add_manual_flashcard(store, owner_id, course_id, topic_index, front, back):
    bundle = study_course(store, owner_id, course_id)
    if topic_index not in study_topics(bundle):
        raise HTTPException(404, "Тему не знайдено в цьому курсі.")
    if not is_study_card(front, back) or not front_key(front):
        raise HTTPException(422, "Введи запитання й відповідь для картки.")
    with store._connect() as conn:
        conn.execute("BEGIN IMMEDIATE")
        existing = _cards(bundle, _saved_cards(conn, owner_id, course_id, topic_index))[topic_index]
        if _id(front) in existing:
            raise HTTPException(409, "У цій темі вже є картка з таким запитанням.")
        added = _save_card(conn, owner_id, course_id, topic_index, front, back)
    return {"added": added}


async def expand_topic_flashcards(store, owner_id, course_id, topic_index):
    bundle = study_course(store, owner_id, course_id)
    topic = study_topics(bundle).get(topic_index)
    if not topic:
        raise HTTPException(404, "Тему не знайдено в цьому курсі.")

    with store._connect() as conn:
        sources = topic_sources(conn, owner_id, course_id, topic_index)
        existing = _cards(bundle, _saved_cards(conn, owner_id, course_id, topic_index))[topic_index]
    if not sources:
        raise HTTPException(422, "Для карток потрібен навчальний текст теми. Додай матеріал або синхронізуй курс.")

    provider = LearningSettingsStore(store.db_path).get(owner_id)
    if not provider:
        raise LearningProviderError("Підключи Gemini, щоб створити картки.", 424)
    fronts = [card["front"] for card in existing.values()]
    prompt = build_flashcard_prompt(bundle["course"].title, topic["title"], sources, fronts[-100:], FLASHCARD_BATCH_SIZE)
    with learning_provider_scope(provider):
        result = await GeminiService().generate_content(
            prompt, system_instruction=FLASHCARD_INSTRUCTIONS, json_mode=True, temperature=0.3, timeout=60,
        )
    cards = parse_flashcards(result or "", sources, fronts, FLASHCARD_BATCH_SIZE)
    if not cards:
        raise LearningProviderError("Gemini не повернув нових карток із підтвердженням у джерелах цієї теми.", 422)

    added = 0
    with store._connect() as conn:
        conn.execute("BEGIN IMMEDIATE")
        if topic_sources(conn, owner_id, course_id, topic_index) != sources:
            raise HTTPException(409, "Матеріали теми змінилися. Спробуй створити картки ще раз.")
        for card in cards:
            added += _save_card(conn, owner_id, course_id, topic_index, **card)
    return {"added": added}


def review_flashcard(store, owner_id, course_id, topic_index, card_id, rating):
    bundle = study_course(store, owner_id, course_id)
    if topic_index not in study_topics(bundle):
        raise HTTPException(404, "Тему не знайдено в цьому курсі.")
    _, interval, delay = RATINGS[rating]
    next_review = (datetime.now(timezone.utc) + delay).isoformat()

    with store._connect() as conn:
        conn.execute("BEGIN IMMEDIATE")
        cards = _cards(bundle, _saved_cards(conn, owner_id, course_id, topic_index))[topic_index]
        card = cards.get(card_id)
        if not card:
            raise HTTPException(404, "Картку не знайдено в цій темі.")
        conn.execute(
            """INSERT INTO workspace_flashcards (
                owner_id, course_id, topic_index, card_id, front, back, source_citation, next_review_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(owner_id, course_id, topic_index, card_id) DO UPDATE SET
                next_review_at=excluded.next_review_at""",
            (owner_id, course_id, topic_index, card_id, card["front"], card["back"],
             card["source_citation"], next_review),
        )
    return {"topics": flashcard_session(store, owner_id, course_id)["topics"], "next_review_in": interval}
