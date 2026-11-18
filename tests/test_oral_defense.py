"""Tests for Live Oral Defense question generation and multimodal voice answer evaluation."""
import base64
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services import build_queue as bq
from app.services import workspace_store as ws
from app.services.build_queue import DebouncedBuildQueue
from app.services.learning_provider import LearningSettingsStore
from app.services.workspace_store import WorkspaceStore


@pytest.fixture
def oral_ctx(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), "GEMINI_API_KEY", "")
    monkeypatch.setattr(get_settings(), "VERTEX_AI_PROJECT", None)
    monkeypatch.setattr(get_settings(), "VERTEX_AI_LOCATION", "global")
    monkeypatch.setattr(get_settings(), "MOODLE_MOCK_MODE", False)
    db_path = str(tmp_path / "workspace.db")
    monkeypatch.setattr(get_settings(), "WORKSPACE_DB_PATH", db_path)
    store = WorkspaceStore(db_path)
    queue = DebouncedBuildQueue()
    monkeypatch.setattr(ws, "_store_instance", store)
    monkeypatch.setattr(bq, "_build_queue", queue)
    client = TestClient(app)
    res = client.post(
        "/api/workspace/courses/create-text",
        json={
            "title": "Теорія ймовірностей",
            "content_text": (
                "Функція маси ймовірностей PMF визначає P(X = x) для дискретної випадкової величини. "
                "Кумулятивна функція розподілу CDF визначається як F_X(x) = P(X <= x), вона неспадна "
                "та набуває значень від 0 до 1."
            ),
            "tools_config": {"mermaid_diagrams": False, "visual_cards": False},
        },
    )
    assert res.status_code == 200, res.text
    course_id = res.json()["course_id"]
    bundle = client.get(f"/api/workspace/courses/{course_id}").json()
    owner_id = bundle["course"]["owner_id"]
    topic_index = bundle["topic_mixes"][0]["topic_index"]
    yield client, store, owner_id, course_id, topic_index
    queue.cancel_all()


def test_oral_defense_requires_gemini_key(oral_ctx):
    client, store, owner_id, course_id, topic_index = oral_ctx

    res = client.post(
        f"/api/workspace/courses/{course_id}/topics/{topic_index}/oral-defense/question",
        json={"difficulty": "standard"},
    )
    assert res.status_code == 424
    assert "Gemini API key" in res.json()["detail"]


def test_oral_defense_question_and_multimodal_audio_evaluation(oral_ctx, monkeypatch):
    client, store, owner_id, course_id, topic_index = oral_ctx
    LearningSettingsStore(store.db_path).save(owner_id, "AIzaSyTestPersonalKey1234567890", "gemini-2.5-flash")

    captured_payloads = []

    async def fake_post(self, url, json=None, headers=None, **kwargs):
        captured_payloads.append({"url": url, "json": json, "headers": headers})
        parts = json["contents"][0]["parts"]
        has_inline_audio = any("inlineData" in p for p in parts)
        if not has_inline_audio:
            body_json = {
                "question_text": "Поясніть, будь ласка, чим відрізняється функція маси ймовірностей PMF від кумулятивної функції розподілу CDF для дискретної випадкової величини.",
                "language": "uk-UA",
                "expected_key_points": [
                    "PMF дає точкову ймовірність P(X = x)",
                    "CDF дає накопичену ймовірність P(X <= x)",
                    "CDF неспадна та прямує від 0 до 1",
                ],
                "source_hint": "Конспект теми",
            }
        else:
            body_json = {
                "user_transcript": "PMF це ймовірність конкретного значення ікс, а CDF завжди зростає строго від мінус одиниці до одиниці.",
                "verdict": "partial",
                "verdict_label": "Часткова відповідь: є неточності та пропуски",
                "what_was_correct": ["Правильно вказано, що PMF визначає ймовірність окремого значення P(X = x)."],
                "what_was_wrong": [
                    {
                        "said": "CDF змінюється від -1 до 1",
                        "correction": "Кумулятивна функція розподілу CDF є ймовірністю, тому завжди лежить у межах від 0 до 1.",
                    }
                ],
                "what_was_missed": [
                    "Не вказано формальне означення CDF як F_X(x) = P(X <= x) та її неперервність справа."
                ],
                "detailed_feedback": "Ти правильно розумієш сенс PMF, але припустився помилки щодо діапазону значень CDF (ймовірність не може бути -1) та пропустив означення P(X <= x).",
                "ideal_answer": "PMF задає ймовірність кожного окремого значення P(X = x), тоді як CDF — це накопичена ймовірність F_X(x) = P(X <= x), яка неспадна і набуває значень від 0 до 1.",
            }
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": __import__("json").dumps(body_json, ensure_ascii=False)}]
                        }
                    }
                ]
            },
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    # 1. Generate oral question from lecture materials
    q_res = client.post(
        f"/api/workspace/courses/{course_id}/topics/{topic_index}/oral-defense/question",
        json={"difficulty": "standard", "previous_questions": []},
    )
    assert q_res.status_code == 200, q_res.text
    q_data = q_res.json()
    assert q_data["question_id"].startswith("od-")
    assert q_data["language"] == "uk-UA"
    assert "PMF" in q_data["question_text"]

    # 2. Submit student voice audio answer
    fake_audio = b"OggS" + b"\x11\x22\x33\x44" * 120
    ev_res = client.post(
        f"/api/workspace/courses/{course_id}/topics/{topic_index}/oral-defense/evaluate",
        data={
            "question_id": q_data["question_id"],
            "transcript": "PMF це ймовірність ікс",
        },
        files={"audio": ("answer.webm", fake_audio, "audio/webm;codecs=opus")},
    )
    assert ev_res.status_code == 200, ev_res.text
    ev_data = ev_res.json()

    assert ev_data["verdict"] == "partial"
    assert len(ev_data["what_was_wrong"]) == 1
    assert "від -1 до 1" in ev_data["what_was_wrong"][0]["said"]
    assert len(ev_data["what_was_missed"]) == 1
    assert "P(X <= x)" in ev_data["what_was_missed"][0]
    assert "припустився помилки" in ev_data["detailed_feedback"]

    # Verify Gemini received normalized audio/webm inlineData
    assert len(captured_payloads) == 2
    audio_parts = captured_payloads[1]["json"]["contents"][0]["parts"]
    inline_part = next((p for p in audio_parts if "inlineData" in p), None)
    assert inline_part is not None
    assert inline_part["inlineData"]["mimeType"] == "audio/webm"
    assert base64.b64decode(inline_part["inlineData"]["data"]) == fake_audio

    # 3. Verify another owner cannot hijack this oral defense session
    other_client = TestClient(app)
    other_bundle_res = other_client.post(
        "/api/workspace/courses/create-text",
        json={"title": "Other", "content_text": "Other content for isolated owner"},
    )
    other_cid = other_bundle_res.json()["course_id"]
    other_owner = other_client.get(f"/api/workspace/courses/{other_cid}").json()["course"]["owner_id"]
    LearningSettingsStore(store.db_path).save(other_owner, "AIzaSyOtherKey1234567890", "gemini-2.5-flash")
    cross_res = other_client.post(
        f"/api/workspace/courses/{course_id}/topics/{topic_index}/oral-defense/evaluate",
        data={"question_id": q_data["question_id"], "transcript": "test"},
    )
    assert cross_res.status_code == 404


def test_oral_defense_rejects_empty_answer_and_propagates_provider_error(oral_ctx, monkeypatch):
    client, store, owner_id, course_id, topic_index = oral_ctx
    LearningSettingsStore(store.db_path).save(owner_id, "AIzaSyTestPersonalKey1234567890", "gemini-2.5-flash")

    async def ok_post(self, url, json=None, headers=None, **kwargs):
        return httpx.Response(
            200,
            json={
                "candidates": [{
                    "content": {
                        "parts": [{
                            "text": '{"question_text": "Сформулюйте властивості дисперсії.", "language": "uk-UA", "expected_key_points": ["Var(aX+b)=a^2Var(X)"], "source_hint": "Topic"}'
                        }]
                    }
                }]
            },
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", ok_post)
    q_res = client.post(
        f"/api/workspace/courses/{course_id}/topics/{topic_index}/oral-defense/question",
        json={},
    )
    assert q_res.status_code == 200
    qid = q_res.json()["question_id"]

    # Empty answer -> 422
    empty_res = client.post(
        f"/api/workspace/courses/{course_id}/topics/{topic_index}/oral-defense/evaluate",
        data={"question_id": qid, "transcript": "   "},
    )
    assert empty_res.status_code == 422

    # Provider 429 error -> propagated truthfully, never faked
    async def rate_limited_post(self, url, json=None, headers=None, **kwargs):
        return httpx.Response(429, json={"error": {"message": "Quota exceeded"}})

    monkeypatch.setattr(httpx.AsyncClient, "post", rate_limited_post)
    err_res = client.post(
        f"/api/workspace/courses/{course_id}/topics/{topic_index}/oral-defense/evaluate",
        data={"question_id": qid, "transcript": "Дисперсія невід'ємна"},
    )
    assert err_res.status_code == 429
    assert "Ліміт Gemini вичерпано" in err_res.json()["detail"]
