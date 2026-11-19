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
from app.models.mix import Flashcard, PracticeQuestion, RawTopicSnapshot
from app.services.flashcard_prompt import FLASHCARD_INSTRUCTIONS
from app.services.gemini_service import GeminiService
from app.services.learning_provider import (
    LearningSettingsStore, LearningProvider, LearningProviderError,
    current_provider, learning_provider_scope, validate_gemini_key,
)
from app.services.mix_generator import get_mix_generator
from app.services.topic_quizzes import QUIZ_INSTRUCTIONS
from app.services.workspace_store import WorkspaceStore


@pytest.fixture
def context(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), "GEMINI_API_KEY", "")
    monkeypatch.setattr(get_settings(), "VERTEX_AI_PROJECT", None)
    monkeypatch.setattr(get_settings(), "VERTEX_AI_LOCATION", "global")
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


def test_more_flashcards_are_grounded_and_preserve_the_topic_review(context, monkeypatch):
    client, store = context
    bundle = seed(client)
    course_id = bundle["course"]["course_id"]
    owner = bundle["course"]["owner_id"]
    mix = store.get_course_bundle(course_id, owner)["topic_mixes"][0]
    topic_index = mix.topic_index
    front = "Що таке медіана?"
    mix.flashcards = [
        Flashcard(front=front, back="Центральне значення впорядкованої вибірки."),
        Flashcard(front="Key Concept #1", back="Текст-заглушка"),
    ]
    mix.user_notes = "Мої нотатки"
    store._save_topic_mix(mix, owner)
    base = f"/api/workspace/courses/{course_id}"
    session_url = f"{base}/flashcards?topic_index={topic_index}"
    expand_url = f"{base}/topics/{topic_index}/flashcards"

    initial = client.get(session_url).json()
    assert [card["front"] for card in initial["queue"]] == [front]
    old_id = initial["queue"][0]["card_id"]
    wrong_topic = client.post(f"{base}/topics/{topic_index + 100}/flashcards/review",
                              json={"card_id": old_id, "rating": "easy"})
    assert wrong_topic.status_code == 404
    rated = client.post(f"{expand_url}/review", json={"card_id": old_id, "rating": "easy"})
    assert rated.status_code == 200
    assert rated.json()["topics"][0]["due_count"] == 0
    old_schedule = client.get(session_url + "&practice_all=true").json()["queue"][0]["next_review_at"]

    assert client.post(expand_url).status_code == 424
    install_key(store, bundle)
    question = {
        "front": "Що зміниться в обчисленні медіани, якщо додати четверте спостереження?",
        "back": "Візьми середнє двох центральних елементів упорядкованої вибірки.",
        "kind": "edge_case", "source_id": "1", "evidence": "для парної — середнє двох центральних",
    }

    async def generate(self, prompt, **kwargs):
        assert kwargs["system_instruction"] == FLASHCARD_INSTRUCTIONS
        payload = json.loads(prompt)
        assert payload["course"] == bundle["course"]["title"]
        assert payload["topic"] == mix.title and payload["maximum_cards"] == 12
        assert payload["existing_fronts"] == [front] and "Мої нотатки" not in prompt
        return json.dumps([
            question,
            {**question, "front": front.replace("?", ".")},
            {**question, "front": "Помилка без джерела", "evidence": "вигадана цитата"},
            {**question, "front": "Інше джерело", "source_id": "999"},
        ])

    monkeypatch.setattr(GeminiService, "generate_content", generate)
    response = client.post(expand_url)
    assert response.status_code == 200 and response.json()["added"] == 1
    session = client.get(session_url).json()
    assert [card["front"] for card in session["queue"]] == [question["front"]]
    assert session["queue"][0]["source_citation"]
    assert session["topics"][0]["cards_count"] == 2
    all_cards = client.get(session_url + "&practice_all=true").json()["queue"]
    assert next(card for card in all_cards if card["card_id"] == old_id)["next_review_at"] == old_schedule
    assert store.get_course_bundle(course_id, owner)["topic_mixes"][0].user_notes == "Мої нотатки"
    other = TestClient(app)
    assert other.get(session_url).status_code == 404
    assert other.post(expand_url).status_code == 404


def test_manual_practice_is_available_without_gemini_and_scoped_to_the_section(context):
    client, store = context
    bundle = seed(client)
    course_id, owner = bundle["course"]["course_id"], bundle["course"]["owner_id"]
    mix = store.get_course_bundle(course_id, owner)["topic_mixes"][0]
    second_index = mix.topic_index + 1
    snapshot = RawTopicSnapshot(
        source_id="second-topic", course_id=course_id, title="Дисперсія", content_text="",
    )
    store._save_snapshot(snapshot, second_index, owner)
    store._save_topic_mix(mix.model_copy(update={
        "mix_id": "second-topic", "topic_index": second_index, "title": snapshot.title,
        "source_hash": snapshot.source_hash, "quizzes": [], "flashcards": [],
    }), owner)

    base = f"/api/workspace/courses/{course_id}"
    first = f"{base}/topics/{mix.topic_index}"
    second = f"{base}/topics/{second_index}"
    quiz = {
        "question": "Який елемент визначає медіану непарної вибірки?",
        "options": ["Найменший", "Центральний", "Найбільший"], "correct_index": 1,
    }
    assert client.get(f"{base}/quizzes?topic_index={mix.topic_index}").json()["questions"] == []
    assert client.post(f"{first}/quizzes").status_code == 424
    assert client.post(f"{second}/quizzes").status_code == 422
    assert client.post(f"{first}/quizzes/manual", json={**quiz, "options": ["A", "a"]}).status_code == 422
    assert client.post(f"{first}/quizzes/manual", json=quiz).json() == {"added": 1}
    assert client.post(f"{first}/quizzes/manual", json=quiz).status_code == 409
    questions = client.get(f"{base}/quizzes?topic_index={mix.topic_index}").json()["questions"]
    assert [q["question"] for q in questions] == [quiz["question"]]
    assert client.get(f"{base}/quizzes?topic_index={second_index}").json()["questions"] == []

    card = {"front": "Що означає дисперсія?", "back": "Міра розсіювання значень."}
    assert client.post(f"{second}/flashcards/manual", json=card).json() == {"added": 1}
    assert client.post(f"{second}/flashcards/manual", json=card).status_code == 409
    cards = client.get(f"{base}/flashcards?topic_index={second_index}").json()["queue"]
    assert [(item["front"], item["back"]) for item in cards] == [(card["front"], card["back"])]
    assert client.get(f"{base}/flashcards?topic_index={mix.topic_index}").json()["queue"] == []
    assert client.post(f"{base}/topics/998/flashcards/manual", json=card).status_code == 404
    with TestClient(app) as other:
        assert other.get(f"{base}/quizzes").status_code == 404
        assert other.post(f"{first}/quizzes/manual", json=quiz).status_code == 404


def test_quiz_generation_checks_sources_and_appends_to_existing_questions(context, monkeypatch):
    client, store = context
    bundle = seed(client)
    course_id, owner = bundle["course"]["course_id"], bundle["course"]["owner_id"]
    mix = store.get_course_bundle(course_id, owner)["topic_mixes"][0]
    original = PracticeQuestion(
        question="Що таке медіана?", options=["Центральне значення", "Сума"],
        correct_index=0, explanation="Спочатку впорядковуємо вибірку.",
    )
    placeholder = original.model_copy(update={"question": "How many core study items were indexed?"})
    mix.quizzes = [original, placeholder]
    mix.user_notes = "Приватні нотатки студента"
    store._save_topic_mix(mix, owner)
    install_key(store, bundle)
    question = {
        "question": "Яка медіана у вибірці 1, 3, 5, 9?",
        "options": ["3", "4", "5"], "correct_index": 1,
        "explanation": "Для парної кількості спостережень обчислюємо середнє 3 і 5.",
        "kind": "edge_case", "source_id": "1", "evidence": "для парної — середнє двох центральних",
    }

    async def generate(self, prompt, **kwargs):
        assert kwargs["system_instruction"] == QUIZ_INSTRUCTIONS
        assert "Приватні нотатки студента" not in prompt
        payload = json.loads(prompt)
        assert payload["course"] == bundle["course"]["title"]
        assert payload["topic"] == mix.title and payload["maximum_questions"] == 8
        assert payload["existing_questions"][0] == original.question
        assert question["evidence"] in payload["sources"][0]["text"]
        return json.dumps([
            {**question, "question": original.question, "explanation": original.explanation},
            {**question, "question": "Який ряд підходить?", "evidence": "вигадана цитата"},
            {**question, "question": "Що перевірити спочатку?", "correct_index": 3},
            {**question, "question": "Як перевірити правило?", "options": ["А", "Б", "А"]},
            question,
        ])

    monkeypatch.setattr(GeminiService, "generate_content", generate)
    base = f"/api/workspace/courses/{course_id}"
    generate_url = f"{base}/topics/{mix.topic_index}/quizzes"
    response = client.post(generate_url)
    assert response.status_code == 200 and response.json() == {"added": 1}
    assert client.post(generate_url).status_code == 422
    result = client.get(f"{base}/quizzes?topic_index={mix.topic_index}").json()
    assert result["topics"][0]["question_count"] == 2
    assert [q["question"] for q in result["questions"]] == [original.question, question["question"]]
    assert result["questions"][1]["source_citation"]
    saved = store.get_course_bundle(course_id, owner)["topic_mixes"][0]
    assert saved.quizzes == [original, placeholder] and saved.user_notes == mix.user_notes


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


def test_vertex_ai_server_mode_uses_metadata_token_and_global_endpoint(context, monkeypatch):
    client, _ = context
    monkeypatch.setattr(get_settings(), "VERTEX_AI_PROJECT", "causal-medium-515110-b2")
    monkeypatch.setattr(get_settings(), "VERTEX_AI_LOCATION", "global")
    monkeypatch.setattr(get_settings(), "GEMINI_MODEL", "gemini-3-flash-preview")

    from app.services import gemini_service as gs_mod
    gs_mod._VERTEX_TOKEN_CACHE["token"] = None
    gs_mod._VERTEX_TOKEN_CACHE["expires_at"] = 0.0

    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(str(request.url))
        if "metadata.google.internal" in str(request.url):
            assert request.headers.get("metadata-flavor") == "Google"
            return httpx.Response(200, json={"access_token": "gcp-meta-tok", "expires_in": 3600})
        assert request.url.host == "aiplatform.googleapis.com"
        assert "/v1/projects/causal-medium-515110-b2/locations/global/publishers/google/models/gemini-3-flash-preview:generateContent" in request.url.path
        assert request.headers.get("authorization") == "Bearer gcp-meta-tok"
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "OK_VERTEX"}]}}]})

    orig_client = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: orig_client(transport=httpx.MockTransport(handler), **kw))

    status_res = client.get("/api/workspace/learning/settings")
    assert status_res.status_code == 200
    assert status_res.json() == {
        "configured": True,
        "provider": "gemini",
        "model": "gemini-3-flash-preview",
        "source": "vertex",
        "server_default_available": True,
    }

    out = asyncio.run(GeminiService().generate_content("Ping"))
    assert out == "OK_VERTEX"
    assert any("metadata.google.internal" in u for u in seen)


def test_prepare_learning_grounds_prompts_in_course_and_skips_moodle_metadata_chunks(context, monkeypatch):
    client, store = context
    owner = client.get("/api/workspace/session").json()["owner_id"]
    LearningSettingsStore(store.db_path).save(owner, "valid-test-key-never-print", "gemini-3.8-flash")
    asyncio.run(store.sync_extension_payload(
        __import__("app.models.mix", fromlist=["ExtensionSyncPayload"]).ExtensionSyncPayload(
            authority="ucu",
            moodle_url="https://learn.ucu.edu.ua",
            course_id=9400,
            course_name="Probability & Statistics",
            tools_config={"interactive_book": False, "practice_quizzes": False, "flashcards": False, "mermaid_diagrams": False, "visual_cards": False},
            sections=[{
                "section_index": 13,
                "title": "Topic 1: Introduction",
                "modules": [
                    {"module_id": 1, "name": "Topic 1 label", "modname": "label"},
                    {"module_id": 2, "name": "L1: Sample Space", "modname": "lesson"},
                    {"module_id": 3, "name": "Quiz 1", "modname": "quiz"},
                    {"module_id": 4, "name": "Extra bonus", "modname": "label"},
                ],
            }],
        ),
        owner_id=owner,
    ))
    prompts = []

    async def capture(self, prompt, **kwargs):
        prompts.append(prompt)
        if "multiple-choice" in prompt:
            return json.dumps([{"question": "What is sample space?", "options": ["All outcomes", "One event"], "correct_index": 0, "explanation": "Definition of Omega."}])
        if "flashcards" in prompt:
            return json.dumps([{"front": "Sample space", "back": "Set of all possible outcomes"}])
        if "flowchart TD" in prompt:
            return 'flowchart TD\n  A["Omega"]'
        return json.dumps({"explanation_markdown": "# L1\n\nProbability basics.", "key_takeaways": ["Omega is the sample space."]})

    monkeypatch.setattr(GeminiService, "generate_content", capture)
    res = client.post("/api/workspace/courses/9400/topics/13/prepare-learning")
    assert res.status_code == 200, res.text

    bundle = client.get("/api/workspace/courses/9400").json()
    mix = bundle["topic_mixes"][0]
    # Only the study module (lesson) produced a book section, not label/quiz metadata stubs.
    assert [sec["chunk_id"] for sec in mix["book_sections"]] == ["mod-2"]
    assert all("Probability & Statistics" in p for p in prompts)
    assert not any("[LESSON]" in p or "[LABEL]" in p for p in prompts)


def test_artifact_cache_does_not_leak_across_different_courses_with_same_title(context, monkeypatch):
    client, store = context
    from app.models.mix import ExtensionSyncPayload

    async def sync_course(cid, course_name):
        client_n = TestClient(app)
        sess = client_n.get("/api/workspace/session").json()
        LearningSettingsStore(store.db_path).save(sess["owner_id"], f"key-{cid}", "gemini-3.8-flash")
        await store.sync_extension_payload(
            ExtensionSyncPayload(
                authority="ucu",
                moodle_url="https://learn.ucu.edu.ua",
                course_id=cid,
                course_name=course_name,
                tools_config={"interactive_book": True, "practice_quizzes": True, "flashcards": False, "mermaid_diagrams": False, "visual_cards": False},
                sections=[{
                    "section_index": 1,
                    "title": "Topic 1: Introduction",
                    "modules": [{"module_id": 10, "name": "L1: Introduction", "modname": "lesson"}],
                }],
            ),
            owner_id=sess["owner_id"],
        )

    seen_courses = []

    async def fake_generate(self, prompt, **kwargs):
        if "Probability" in prompt:
            seen_courses.append("Probability")
            if "multiple-choice" in prompt:
                return json.dumps([{"question": "Prob Q?", "options": ["A", "B"], "correct_index": 0, "explanation": "P"}])
            return json.dumps({"explanation_markdown": "# Prob", "key_takeaways": ["Axioms"]})
        seen_courses.append("Algorithms")
        if "multiple-choice" in prompt:
            return json.dumps([{"question": "Algo Q?", "options": ["A", "B"], "correct_index": 0, "explanation": "Big-O"}])
        return json.dumps({"explanation_markdown": "# Algo", "key_takeaways": ["Asymptotics"]})

    monkeypatch.setattr(GeminiService, "generate_content", fake_generate)
    asyncio.run(sync_course(1001, "Probability & Statistics"))
    asyncio.run(sync_course(1002, "Algorithms & Data Structures"))
    assert "Probability" in seen_courses and "Algorithms" in seen_courses


def test_clear_topic_and_course_generated_preserves_notes_sources_and_isolation(context, monkeypatch):
    client, store = context
    bundle = seed(client)
    cid = bundle["course"]["course_id"]
    topic = bundle["topic_mixes"][0]
    t_idx = topic["topic_index"]
    client.patch(f'/api/workspace/mixes/{topic["mix_id"]}/notes', json={"notes": "Keep my notes"})
    install_key(store, bundle)

    async def generated(self, prompt, **kwargs):
        if "multiple-choice" in prompt:
            return json.dumps([{"question": "Median?", "options": ["Mid", "Max"], "correct_index": 0, "explanation": "Mid."}])
        if "flashcards" in prompt:
            return json.dumps([{"front": "Median", "back": "Middle value"}])
        return json.dumps({"explanation_markdown": "## Median", "key_takeaways": ["Ordered sample."]})

    monkeypatch.setattr(GeminiService, "generate_content", generated)
    assert client.post(f"/api/workspace/courses/{cid}/topics/{t_idx}/prepare-learning").status_code == 200
    assert client.post(f"/api/workspace/courses/{cid}/exam-mix").status_code == 200

    # Other account cannot delete this owner's generated data.
    other = TestClient(app)
    other.get("/api/workspace/session")
    assert other.delete(f"/api/workspace/courses/{cid}/topics/{t_idx}/generated").status_code == 404
    assert other.delete(f"/api/workspace/courses/{cid}/generated").status_code == 404

    # Topic clear resets generated sections/quizzes/flashcards, preserves mix_id/notes/materials/versions.
    del_topic = client.delete(f"/api/workspace/courses/{cid}/topics/{t_idx}/generated")
    assert del_topic.status_code == 200
    after_topic = client.get(f"/api/workspace/courses/{cid}").json()
    mix = after_topic["topic_mixes"][0]
    assert mix["mix_id"] == topic["mix_id"]
    assert mix["user_notes"] == "Keep my notes"
    assert mix["materials"] == topic["materials"]
    assert mix["book_sections"] == []
    assert mix["quizzes"] == []
    assert mix["flashcards"] == []
    assert after_topic["course"]["exam_mix_stale"] is True

    # Re-prepare and then clear entire course (including exam_mix).
    assert client.post(f"/api/workspace/courses/{cid}/topics/{t_idx}/prepare-learning").status_code == 200
    assert client.post(f"/api/workspace/courses/{cid}/exam-mix").status_code == 200
    del_course = client.delete(f"/api/workspace/courses/{cid}/generated")
    assert del_course.status_code == 200
    after_course = client.get(f"/api/workspace/courses/{cid}").json()
    assert after_course["topic_mixes"][0]["book_sections"] == []
    assert after_course["topic_mixes"][0]["user_notes"] == "Keep my notes"
    assert after_course["exam_mix"] is None
    assert after_course["course"]["exam_mix_stale"] is False
    with store._connect() as conn:
        assert conn.execute("SELECT COUNT(*) FROM learning_topic_versions").fetchone()[0] >= 2
        assert conn.execute("SELECT COUNT(*) FROM topic_snapshots").fetchone()[0] == 1


def test_course_sync_does_not_call_live_ai_or_fail_when_gemini_rejects(context, monkeypatch):
    client, _ = context
    monkeypatch.setattr(get_settings(), "VERTEX_AI_PROJECT", "causal-medium-515110-b2")
    called = []

    async def boom(*args, **kwargs):
        called.append(True)
        raise LearningProviderError("Gemini відхилив запит для цього матеріалу", 400)

    monkeypatch.setattr(GeminiService, "generate_content", boom)

    res = client.post("/api/sync/extension", json={
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 8855,
        "course_name": "Основи національного спротиву",
        "sections": [
            {"section_index": 9, "title": "Виживання (розвідка) / Тактика", "modules": [
                {"module_id": 159520, "name": "Виживання (розвідка)", "modname": "resource"}
            ]}
        ],
    })
    assert res.status_code == 200, res.text
    assert called == []
    bundle = client.get("/api/workspace/courses/8855").json()
    assert bundle["course"]["title"] == "Основи національного спротиву"
    assert bundle["topic_mixes"][0]["book_sections"] == []


def test_provider_http_error_distinguishes_400_and_vertex_auth():
    from app.services.learning_provider import provider_http_error
    err_400 = provider_http_error(400, source="vertex", detail="Request payload too large")
    assert err_400.status_code == 400
    assert "відхилив ключ" not in str(err_400)
    assert "Request payload too large" in str(err_400)

    err_vertex_403 = provider_http_error(403, source="vertex")
    assert err_vertex_403.status_code == 502
    assert "Vertex AI" in str(err_vertex_403)

    err_personal_403 = provider_http_error(403, source="personal")
    assert err_personal_403.status_code == 400
    assert "відхилив ключ" in str(err_personal_403)


def test_youtube_url_helpers_and_moodle_redirect_cookie_safety():
    from app.services.video_transcriber import VideoTranscriberService
    from app.services.moodle_client import MoodleClient

    assert VideoTranscriberService.normalize_youtube_url("https://youtu.be/HZGCoVF3YvM?t=12") == "https://www.youtube.com/watch?v=HZGCoVF3YvM"
    urls = VideoTranscriberService.extract_youtube_urls_from_text(
        '<a href="https://www.youtube.com/embed/HZGCoVF3YvM">Vid</a> and https://youtu.be/dQw4w9WgXcQ.'
    )
    assert urls == ["https://www.youtube.com/watch?v=HZGCoVF3YvM", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"]

    seen_hosts = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_hosts.append(request.url.host)
        return httpx.Response(302, headers={"location": "https://youtu.be/HZGCoVF3YvM"})

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as hc:
            return await MoodleClient(base_url="https://learn.ucu.edu.ua").fetch_module_resource(
                cookie="secret-moodle-cookie",
                module_url="https://learn.ucu.edu.ua/mod/url/view.php?id=555",
                modname="url",
                http_client=hc,
            )

    res = asyncio.run(run())
    assert seen_hosts == ["learn.ucu.edu.ua"]
    assert res["resolved_url"] == "https://www.youtube.com/watch?v=HZGCoVF3YvM"
    assert res["youtube_urls"] == ["https://www.youtube.com/watch?v=HZGCoVF3YvM"]


def test_youtube_link_create_and_prepare_learning_uses_gemini_video_fallback_and_caches(context, monkeypatch):
    client, store = context
    from app.services.video_transcriber import VideoTranscriberService

    monkeypatch.setattr(VideoTranscriberService, "get_youtube_transcript", classmethod(lambda cls, url: None))

    bad = client.post("/api/workspace/courses/create-text", json={
        "title": "Video Course",
        "youtube_url": "https://example.com/not-youtube",
    })
    assert bad.status_code == 400

    res = client.post("/api/workspace/courses/create-text", json={
        "title": "Probability Video",
        "topic_title": "Bayes Lecture",
        "youtube_url": "https://youtu.be/HZGCoVF3YvM",
        "tools_config": {"interactive_book": False, "practice_quizzes": False, "flashcards": False, "mermaid_diagrams": False, "visual_cards": False},
    })
    assert res.status_code == 200, res.text
    cid = res.json()["course_id"]
    bundle = client.get(f"/api/workspace/courses/{cid}").json()
    owner = bundle["course"]["owner_id"]
    install_key(store, bundle)

    seen_calls = []

    async def fake_generate(self, prompt, **kwargs):
        seen_calls.append({"prompt": prompt, "extra_parts": kwargs.get("extra_parts")})
        if kwargs.get("extra_parts"):
            return "Теорема Баєса оновлює апріорну ймовірність P(H) за новими доказами."
        if "multiple-choice" in prompt:
            return json.dumps([{"question": "Що оновлює теорема Баєса?", "options": ["P(H|E)", "Обидва"], "correct_index": 0, "explanation": "Апостеріорну ймовірність."}])
        if "flashcards" in prompt:
            return json.dumps([{"front": "Теорема Баєса", "back": "P(H|E) = P(E|H)P(H)/P(E)"}])
        return json.dumps({"explanation_markdown": "# Bayes", "key_takeaways": ["P(H|E) залежить від доказу."]})

    monkeypatch.setattr(GeminiService, "generate_content", fake_generate)
    prep = client.post(f"/api/workspace/courses/{cid}/topics/{bundle['topic_mixes'][0]['topic_index']}/prepare-learning")
    assert prep.status_code == 200, prep.text

    video_calls = [c for c in seen_calls if c["extra_parts"]]
    assert len(video_calls) == 1
    assert video_calls[0]["extra_parts"] == [{"fileData": {"fileUri": "https://www.youtube.com/watch?v=HZGCoVF3YvM", "mimeType": "video/mp4"}}]
    text_calls = [c for c in seen_calls if not c["extra_parts"]]
    assert any("апріорну ймовірність" in c["prompt"] for c in text_calls)

    # Second call to /api/courses/transcribe-video hits cached YouTube digest without calling Gemini again.
    tr = client.post("/api/courses/transcribe-video", json={"url": "https://www.youtube.com/watch?v=HZGCoVF3YvM"})
    assert tr.status_code == 200
    assert tr.json()["success"] is True
    assert "Теорема Баєса" in tr.json()["full_text"]
    assert len([c for c in seen_calls if c["extra_parts"]]) == 1


def test_transcribe_video_endpoint_falls_back_to_vertex_gemini(context, monkeypatch):
    client, _ = context
    from app.services.video_transcriber import VideoTranscriberService

    monkeypatch.setattr(get_settings(), "VERTEX_AI_PROJECT", "causal-medium-515110-b2")
    monkeypatch.setattr(VideoTranscriberService, "get_youtube_transcript", classmethod(lambda cls, url: None))

    async def fake_generate(self, prompt, **kwargs):
        assert kwargs.get("timeout", 0) >= 120.0
        assert kwargs.get("extra_parts") == [{"fileData": {"fileUri": "https://www.youtube.com/watch?v=abcd1234EFG", "mimeType": "video/mp4"}}]
        return "Короткий конспект відео з Vertex."

    monkeypatch.setattr(GeminiService, "generate_content", fake_generate)
    res = client.post("/api/courses/transcribe-video", json={"url": "https://youtu.be/abcd1234EFG"})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["source"] == "gemini_video"
    assert "Короткий конспект відео з Vertex." in body["full_text"]


def test_reset_personal_learning_key_reverts_to_server_default(context, monkeypatch):
    client, _ = context
    monkeypatch.setattr(get_settings(), "VERTEX_AI_PROJECT", "causal-medium-515110-b2")
    monkeypatch.setattr(get_settings(), "GEMINI_MODEL", "gemini-3-flash-preview")

    async def valid(key):
        return "gemini-2.5-flash"
    monkeypatch.setattr("app.routers.learning.validate_gemini_key", valid)

    initial = client.get("/api/workspace/learning/settings")
    assert initial.status_code == 200
    assert initial.json()["source"] == "vertex"
    assert initial.json()["server_default_available"] is True

    saved = client.put("/api/workspace/learning/settings", json={"api_key": "personal-key-1234567890"})
    assert saved.status_code == 200
    assert saved.json()["source"] == "personal"
    assert saved.json()["model"] == "gemini-2.5-flash"

    reverted = client.delete("/api/workspace/learning/settings")
    assert reverted.status_code == 200
    assert reverted.json()["source"] == "vertex"
    assert reverted.json()["configured"] is True
    assert reverted.json()["model"] == "gemini-3-flash-preview"
