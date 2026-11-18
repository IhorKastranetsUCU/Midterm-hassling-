import asyncio
import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services import workspace_store as ws
from app.services import build_queue as bq
from app.services.build_queue import DebouncedBuildQueue
from app.services.gemini_service import GeminiService
from app.services.learning_provider import (
    LearningSettingsStore, LearningProvider, LearningProviderError,
    current_provider, learning_provider_scope, validate_gemini_key,
)
from app.services.mix_generator import get_mix_generator
from app.services.workspace_store import WorkspaceStore


@pytest.fixture
def context(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), "GEMINI_API_KEY", "")
    monkeypatch.setattr(get_settings(), "MOODLE_MOCK_MODE", False)
    monkeypatch.setattr(get_settings(), "WORKSPACE_DB_PATH", str(tmp_path / "workspace.db"))
    store = WorkspaceStore(str(tmp_path / "workspace.db"))
    queue = DebouncedBuildQueue()
    monkeypatch.setattr(ws, "_store_instance", store)
    monkeypatch.setattr(bq, "_build_queue", queue)
    yield TestClient(app), store
    queue.cancel_all()


def seed(client):
    response = client.post("/api/workspace/courses/create-text", json={
        "title": "Статистика", "content_text": "Медіана — центральне значення впорядкованої вибірки. Для непарної кількості спостережень це один елемент, для парної — середнє двох центральних.",
        "tools_config": {"mermaid_diagrams": False, "visual_cards": False},
    })
    assert response.status_code == 200
    course_id = response.json()["course_id"]
    return client.get(f"/api/workspace/courses/{course_id}").json()


def install_key(store, bundle, key="valid-test-key-never-print"):
    LearningSettingsStore(store.db_path).save(bundle["course"]["owner_id"], key, "gemini-3.8-flash")


def test_settings_are_encrypted_private_and_failed_replacement_keeps_working_key(context, monkeypatch):
    client, store = context
    async def valid(key):
        if key == "wrong-test-key":
            raise LearningProviderError("Ключ відхилено", 400)
        return "gemini-3.8-flash"
    monkeypatch.setattr("app.routers.learning.validate_gemini_key", valid)
    key = "test-secret-that-must-not-leak"
    result = client.put("/api/workspace/learning/settings", json={"api_key": key})
    assert result.status_code == 200
    assert result.json()["configured"] is True
    assert key not in result.text and result.headers["cache-control"] == "no-store"
    assert key.encode() not in Path(store.db_path).read_bytes()
    assert (Path(store.db_path).parent / ".hustle-ai.key").stat().st_mode & 0o777 == 0o600
    assert TestClient(app).get("/api/workspace/learning/settings").json()["configured"] is False
    assert client.put("/api/workspace/learning/settings", json={"api_key": "wrong-test-key"}).status_code == 400
    assert client.get("/api/workspace/learning/settings").json()["configured"] is True
    assert client.put("/api/workspace/learning/settings", json={"api_key": key}, headers={"Origin": "https://untrusted.example"}).status_code == 403


@pytest.mark.asyncio
async def test_key_validation_uses_header_pagination_and_supported_text_models(monkeypatch):
    key = "private-test-key-value"
    calls = []
    def handle(request):
        calls.append(request)
        assert key not in str(request.url)
        assert request.headers["x-goog-api-key"] == key
        if "pageToken" not in request.url.params:
            return httpx.Response(200, json={"models": [{"name": "models/gemini-3.8-flash-tts", "supportedGenerationMethods": ["generateContent"]}], "nextPageToken": "next"})
        return httpx.Response(200, json={"models": [
            {"name": "models/gemini-2.0-flash", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-3.8-flash", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-4-test", "supportedGenerationMethods": ["embedContent"]},
        ]})
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(handle), **kwargs))
    assert await validate_gemini_key(key) == "gemini-3.8-flash"
    assert len(calls) == 2


@pytest.mark.asyncio
async def test_provider_context_isolated_between_concurrent_accounts():
    async def run(key):
        with learning_provider_scope(LearningProvider(key, "gemini-3.8-flash")):
            await asyncio.sleep(0)
            return get_mix_generator().gemini.api_key
    assert await asyncio.gather(run("first-key"), run("second-key")) == ["first-key", "second-key"]
    assert current_provider.get() is None


@pytest.mark.asyncio
async def test_generation_failure_is_not_a_template_and_does_not_log_key(monkeypatch, caplog):
    key = "key-that-cannot-appear-in-log"
    def handle(request):
        assert key not in str(request.url)
        assert request.headers["x-goog-api-key"] == key
        return httpx.Response(429, text="quota error " + key)
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(handle), **kwargs))
    with learning_provider_scope(LearningProvider(key, "gemini-3.8-flash")):
        with pytest.raises(LearningProviderError, match="Ліміт"):
            await get_mix_generator().generate_practice_quizzes("Медіана", ["Серединний елемент"])
    assert key not in caplog.text


def test_prepare_topic_requires_key_and_owner(context):
    client, store = context
    bundle = seed(client)
    path = f'/api/workspace/courses/{bundle["course"]["course_id"]}/topics/{bundle["topic_mixes"][0]["topic_index"]}/prepare-learning'
    assert client.post(path).status_code == 424
    other = TestClient(app)
    other_owner = other.get("/api/workspace/session").json()["owner_id"]
    LearningSettingsStore(store.db_path).save(other_owner, "another-person-key", "gemini-3.8-flash")
    assert other.post(path).status_code == 404


def test_preparation_preserves_notes_sources_and_previous_version(context, monkeypatch):
    client, store = context
    bundle = seed(client); course_id = bundle["course"]["course_id"]
    previous = bundle["topic_mixes"][0]
    client.patch(f'/api/workspace/mixes/{previous["mix_id"]}/notes', json={"notes": "Мої особисті нотатки"})
    install_key(store, bundle)
    calls = []
    async def generated(self, prompt, **kwargs):
        calls.append(self.api_key)
        if "multiple-choice" in prompt:
            return json.dumps([{"question": "Медіана 2, 5, 8?", "options": ["5", "8"], "correct_index": 0, "explanation": "Центральний елемент — 5."}])
        if "flashcards" in prompt:
            return json.dumps([{"front": "Що таке медіана?", "back": "Центральне значення впорядкованої вибірки."}])
        return json.dumps({"explanation_markdown": "## Медіана\n\nУпорядкуй значення й обери центральне. Наприклад, для 2, 5, 8 медіана дорівнює 5.", "key_takeaways": ["Вибірка має бути впорядкована."]})
    monkeypatch.setattr(GeminiService, "generate_content", generated)
    result = client.post(f'/api/workspace/courses/{course_id}/topics/{previous["topic_index"]}/prepare-learning')
    assert result.status_code == 200, result.text
    after = client.get(f'/api/workspace/courses/{course_id}').json()
    mix = after["topic_mixes"][0]
    assert mix["mix_id"] == previous["mix_id"]
    assert mix["user_notes"] == "Мої особисті нотатки"
    assert mix["materials"] == previous["materials"]
    assert mix["quizzes"][0]["question"] == "Медіана 2, 5, 8?"
    assert mix["flashcards"][0]["front"] == "Що таке медіана?"
    assert all(key == "valid-test-key-never-print" for key in calls)
    exam = client.post(f'/api/workspace/courses/{course_id}/exam-mix')
    assert exam.status_code == 200, exam.text
    assert exam.json()["exam_mix"]["mock_exam_questions"] == mix["quizzes"]
    with store._connect() as conn:
        assert conn.execute("SELECT COUNT(*) FROM learning_topic_versions").fetchone()[0] == 1
        assert conn.execute("SELECT COUNT(*) FROM topic_snapshots").fetchone()[0] == 1


def test_failed_generation_preserves_existing_learning_and_notes(context, monkeypatch):
    client, store = context
    bundle = seed(client); before = bundle["topic_mixes"][0]
    install_key(store, bundle)
    async def unavailable(*args, **kwargs):
        raise LearningProviderError("Gemini недоступний")
    monkeypatch.setattr(GeminiService, "generate_content", unavailable)
    result = client.post(f'/api/workspace/courses/{bundle["course"]["course_id"]}/topics/{before["topic_index"]}/prepare-learning')
    assert result.status_code == 502
    after = client.get(f'/api/workspace/courses/{bundle["course"]["course_id"]}').json()["topic_mixes"][0]
    assert after == before
