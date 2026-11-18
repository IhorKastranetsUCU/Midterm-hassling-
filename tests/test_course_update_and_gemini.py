import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.course_update_matcher import CourseUpdateMatcher
from app.services.gemini_service import GeminiService
from app.services.mix_generator import GeminiMixGenerator
from app.services import workspace_store as ws_module
from app.services import build_queue as bq_module
from app.services.workspace_store import WorkspaceStore
from app.services.build_queue import DebouncedBuildQueue


@pytest.fixture()
def isolated_store(tmp_path, monkeypatch):
    db_file = tmp_path / "test_workspace_gemini.db"
    store = WorkspaceStore(db_path=str(db_file))
    fresh_queue = DebouncedBuildQueue()
    monkeypatch.setattr(ws_module, "_store_instance", store)
    monkeypatch.setattr("app.routers.workspace.get_workspace_store", lambda: store)
    monkeypatch.setattr(bq_module, "_build_queue", fresh_queue)
    yield store
    fresh_queue.cancel_all()


def test_course_update_matcher_logical_and_keyword_fallback():
    topics = [
        {
            "topic_index": 1,
            "title": "Тиждень 1: Теорія графів та дерева",
            "keywords": ["граф", "вершина", "ребро", "дерево", "обхід"],
        },
        {
            "topic_index": 2,
            "title": "Тиждень 2: Глибоке навчання та нейронні мережі",
            "keywords": ["нейронна мережа", "градієнтний спуск", "backpropagation", "тензор"],
        },
    ]

    matcher = CourseUpdateMatcher(topics)

    # 1. Section matching logical title
    sec1 = {
        "id": 10,
        "name": "Week 1: Graph Theory",
        "modules": [
            {
                "id": 101,
                "name": "Lecture 1: Intro to Graphs",
                "timemodified": 1700000000,
                "modname": "resource",
            }
        ],
    }

    # 2. Section without matching title (e.g. "Додаткові матеріали")
    # Content has keywords of Topic 2 ("нейронна мережа", "градієнтний спуск")
    sec_orphan = {
        "id": 20,
        "name": "Додаткові матеріали",
        "modules": [
            {
                "id": 201,
                "name": "Стаття про зворотне поширення помилки",
                "description": "Цей матеріал детально пояснює нейронна мережа та градієнтний спуск на практиці.",
                "timemodified": 1710000000,
                "modname": "resource",
            }
        ],
    }

    existing_hashes = {}
    res = matcher.match_all_sections([sec1, sec_orphan], existing_hashes)

    assert res["has_updates"] is True
    assert res["new_materials_count"] == 2
    assert 1 in res["dirty_topics"]
    assert 2 in res["dirty_topics"]

    # Verify material 101 mapped to Topic 1 logically
    t1_mods = res["topic_materials"][1]
    assert any(m["id"] == 101 for m in t1_mods)

    # Verify material 201 mapped to Topic 2 via keyword fallback
    t2_mods = res["topic_materials"][2]
    assert any(m["id"] == 201 for m in t2_mods)

    # Check timestamps
    assert res["topic_timestamps"][1] == datetime.fromtimestamp(1700000000, tz=timezone.utc).isoformat()
    assert res["topic_timestamps"][2] == datetime.fromtimestamp(1710000000, tz=timezone.utc).isoformat()


@pytest.mark.asyncio
async def test_gemini_service_syllabus_parsing_mocked():
    service = GeminiService(api_key="test-key-12345")

    mock_json_text = """
    [
      {
        "topic_index": 1,
        "title": "Тиждень 1: Алгоритми сортування",
        "difficulty": "Intermediate",
        "estimated_hours": 4,
        "summary": "Швидке сортування та сортування злиттям",
        "key_concepts": ["Quicksort", "Mergesort", "O(N log N)"],
        "suggested_focus": "Зрозуміти рекурсивний поділ масиву",
        "keywords": ["quicksort", "mergesort", "сортування"]
      }
    ]
    """

    with patch.object(service, "generate_content", AsyncMock(return_value=mock_json_text)):
        topics = await service.structure_syllabus_to_topics(course_title="Algorithms", custom_syllabus_text="Syllabus text...")
        assert topics is not None
        assert len(topics) == 1
        assert topics[0]["topic_index"] == 1
        assert "Алгоритми сортування" in topics[0]["title"]
        assert "quicksort" in topics[0]["keywords"]


@pytest.mark.asyncio
async def test_gemini_mix_generator_mocked():
    gen = GeminiMixGenerator(api_key="dummy-key")

    mock_resp = {
        "explanation_markdown": "# Складність алгоритмів\n\nПояснення O-нотації.",
        "key_takeaways": ["Часова складність", "Просторова складність"],
    }

    with patch.object(gen.gemini, "generate_book_section_content", AsyncMock(return_value=mock_resp)):
        with patch.object(gen.gemini, "generate_mermaid_diagram", AsyncMock(return_value="graph TD; A-->B;")):
            sec = await gen.generate_book_section(
                "Аналіз складності",
                "Детальний текст про складність алгоритмів"
            )
            assert "Складність алгоритмів" in sec.explanation_markdown
            assert "Часова складність" in sec.key_takeaways
            assert sec.mermaid_diagram == "graph TD; A-->B;"


def test_course_check_updates_api_and_debounce(isolated_store, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "MOODLE_MOCK_MODE", True)
    client = TestClient(app)

    # 1. Create a course structure first
    confirm_payload = {
        "course_id": 101,
        "title": "Data Structures & Algorithms",
        "shortname": "DSA-101",
        "authority": "mock",
        "target_score": 85,
        "gemini_api_key": "user-custom-key-xyz",
        "topics": [
            {
                "topic_index": 1,
                "title": "Тиждень 1: Основи складних структур",
                "difficulty": "intermediate",
                "estimated_hours": 3,
                "summary": "Огляд базових понять",
                "key_concepts": ["масив", "стек"],
                "suggested_focus": "Повторити масиви",
                "keywords": ["масив", "стек", "черга"],
            }
        ],
    }

    res = client.post("/api/workspace/courses/confirm-structure", json=confirm_payload)
    assert res.status_code == 200, res.text

    # 2. Forced check-updates call with ?force=true -> bypasses initial debounce from course creation
    res_force = client.post("/api/workspace/courses/101/check-updates?force=true")
    assert res_force.status_code == 200
    data_force = res_force.json()
    assert data_force["checked"] is True
    assert data_force.get("debounced") is not True

    # 3. Normal check-updates call right after (within 60s) -> should be debounced!
    res_check = client.post("/api/workspace/courses/101/check-updates")
    assert res_check.status_code == 200
    data_check = res_check.json()
    assert data_check["debounced"] is True
    assert "Курс було перевірено" in data_check["message"]
