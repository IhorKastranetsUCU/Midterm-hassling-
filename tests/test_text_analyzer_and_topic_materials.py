import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.mix import TopicMaterialItem
from app.services.course_update_matcher import CourseUpdateMatcher
from app.services.text_analyzer import MaterialTextAnalyzer, clean_html_and_formatting, detect_material_type
from app.services import workspace_store as ws_module
from app.services import build_queue as bq_module
from app.services.workspace_store import WorkspaceStore
from app.services.build_queue import DebouncedBuildQueue


@pytest.fixture()
def isolated_store(tmp_path, monkeypatch):
    db_file = tmp_path / "test_workspace_materials.db"
    store = WorkspaceStore(db_path=str(db_file))
    fresh_queue = DebouncedBuildQueue()
    monkeypatch.setattr(ws_module, "_store_instance", store)
    monkeypatch.setattr("app.routers.workspace.get_workspace_store", lambda: store)
    monkeypatch.setattr(bq_module, "_build_queue", fresh_queue)
    yield store
    fresh_queue.cancel_all()


def test_detect_material_type_across_all_categories():
    # 1. Video detection
    assert detect_material_type("Lecture 1 Video Recording", "url", url="https://youtube.com/watch?v=123") == "video"
    assert detect_material_type("Запис лекції 3", "resource") == "video"
    assert detect_material_type("Panopto Stream", "url", url="https://ucu.panopto.eu/Panopto/...") == "video"
    assert detect_material_type("Session.mp4", "resource", mimetype="video/mp4") == "video"

    # 2. Audio detection
    assert detect_material_type("Audio Podcast Episode 2", "resource") == "audio"
    assert detect_material_type("Аудіо-розбір теми", "url") == "audio"
    assert detect_material_type("lecture_audio.mp3", "resource", mimetype="audio/mp3") == "audio"

    # 3. Self-Test detection
    assert detect_material_type("Self-Test Quiz: Chapter 1", "quiz") == "self_test"
    assert detect_material_type("Самоперевірка знань", "quiz") == "self_test"
    assert detect_material_type("Practice Test", "quiz") == "self_test"

    # 4. Lecture / Slides detection
    assert detect_material_type("Lecture 1 Slides (PDF)", "resource") == "lecture"
    assert detect_material_type("Конспект: Складність алгоритмів", "page") == "lecture"
    assert detect_material_type("handout.pptx", "resource", files=[{"filename": "handout.pptx"}]) == "lecture"

    # 5. Assignment detection
    assert detect_material_type("Lab 1: BST Trees", "assign") == "assignment"
    assert detect_material_type("Homework #2", "assignment") == "assignment"


def test_material_text_analyzer_bullet_extraction():
    raw_description = """
    <p>У цій лекції розглядаються ключові теми курсу:</p>
    <ul>
      <li>Аналіз часової складності алгоритмів у найгіршому та середньому випадках.</li>
      <li>Асимптотична нотація Big-O, Big-Omega та Big-Theta.</li>
      <li>Порівняння рекурсивного та ітеративного підходів до обчислень.</li>
      <li>Практичні приклади оптимізації циклів та пам'яті.</li>
    </ul>
    """
    key_items = MaterialTextAnalyzer.extract_key_items(
        text=raw_description,
        title="Лекція 1: Асимптотика",
        material_type="lecture",
    )

    assert len(key_items) >= 3
    assert any("Аналіз часової складності" in item for item in key_items)
    assert any("Асимптотична нотація" in item for item in key_items)


def test_material_text_analyzer_prose_scoring():
    raw_text = (
        "Асимптотичний аналіз — це математичний метод оцінки продуктивності алгоритмів при зростанні обсягу даних. "
        "Він визначається як поведінка функції часу виконання при прагненні N до нескінченності. "
        "Важливе значення має просторова складність алгоритму O(1) проти O(N). "
        "Цей матеріал пояснює правила спрощення виразів та відкидання констант."
    )
    key_items = MaterialTextAnalyzer.extract_key_items(
        text=raw_text,
        title="Асимптотичний аналіз",
        material_type="lecture",
    )

    assert len(key_items) >= 2
    # Ensure definitions and core concepts are prioritized
    assert any("Асимптотичний аналіз" in item for item in key_items)


def test_material_text_analyzer_sparse_title_synthesis():
    # Video synthesis
    video_items = MaterialTextAnalyzer.extract_key_items(
        text="",
        title="Відеозапис лекції: Графи та дерева",
        material_type="video",
    )
    assert len(video_items) >= 2
    assert any("Відеозапис" in item or "Візуальне" in item for item in video_items)

    # Audio synthesis
    audio_items = MaterialTextAnalyzer.extract_key_items(
        text="",
        title="Аудіо-подкаст: Теорія складності",
        material_type="audio",
    )
    assert len(audio_items) >= 2
    assert any("Аудіо" in item or "подкаст" in item for item in audio_items)

    # Self-test synthesis
    quiz_items = MaterialTextAnalyzer.extract_key_items(
        text="",
        title="Самоперевірка: Тест на розуміння Big-O",
        material_type="self_test",
    )
    assert len(quiz_items) >= 2
    assert any("Самоперевірка" in item or "Формативне" in item for item in quiz_items)


def test_course_update_matcher_generates_topic_material_items():
    topics = [
        {
            "topic_index": 1,
            "title": "Week 1: Algorithmic Complexity",
            "keywords": ["complexity", "big-o", "asymptotics", "lecture", "video", "audio"],
        }
    ]

    sections = [
        {
            "id": 1,
            "name": "Week 1: Foundations",
            "modules": [
                {
                    "id": 101,
                    "name": "Lecture 1 Slides (PDF)",
                    "modname": "resource",
                    "description": "Comprehensive slide deck on complexity.",
                },
                {
                    "id": 102,
                    "name": "Video Lecture: Big-O Intuition",
                    "modname": "url",
                    "url": "https://youtube.com/watch?v=test",
                    "description": "Video walkthrough with practical whiteboard diagrams.",
                },
                {
                    "id": 103,
                    "name": "Audio Podcast: Discussing Complexity",
                    "modname": "resource",
                    "mimetype": "audio/mp3",
                    "description": "Listen to the discussion of worst vs average case.",
                },
                {
                    "id": 104,
                    "name": "Self-Test: Complexity Quiz",
                    "modname": "quiz",
                    "description": "Self-check formative quiz without time limits.",
                },
            ],
        }
    ]

    matcher = CourseUpdateMatcher(topics)
    res = matcher.match_all_sections(sections)

    assert res["total_materials_count"] == 4
    items: list[TopicMaterialItem] = res["topic_material_items"][1]
    assert len(items) == 4

    types = [item.material_type for item in items]
    assert "lecture" in types
    assert "video" in types
    assert "audio" in types
    assert "self_test" in types

    # Each material must have extracted key items
    for item in items:
        assert len(item.key_items) >= 2, f"Expected key items for {item.name}, got: {item.key_items}"


def test_workspace_bundle_returns_materials_with_key_items(isolated_store, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "MOODLE_MOCK_MODE", True)
    client = TestClient(app)

    # 1. Confirm course with mock data (course_id=101)
    confirm_payload = {
        "course_id": 101,
        "title": "Introduction to Computer Science & Algorithms",
        "shortname": "CS101",
        "authority": "mock",
        "target_score": 85,
        "topics": [
            {
                "topic_index": 1,
                "title": "Week 1: Algorithmic Thinking & Asymptotics",
                "difficulty": "intermediate",
                "estimated_hours": 4,
                "summary": "Introduction to Big-O notation, time and space complexity.",
                "key_concepts": ["Big-O", "Time Complexity", "Space Complexity"],
                "suggested_focus": "Master worst vs average case",
                "keywords": ["algorithmic", "asymptotics", "complexity", "big-o"],
            }
        ],
    }

    res_confirm = client.post("/api/workspace/courses/confirm-structure", json=confirm_payload)
    assert res_confirm.status_code == 200, res_confirm.text

    # 2. Fetch the course bundle
    res_bundle = client.get("/api/workspace/courses/101")
    assert res_bundle.status_code == 200
    bundle = res_bundle.json()

    topic_mixes = bundle["topic_mixes"]
    assert len(topic_mixes) >= 1

    mix = topic_mixes[0]
    materials = mix.get("materials", [])
    assert len(materials) >= 4, f"Expected materials in topic mix, got: {len(materials)}"

    # Check presence of video, audio, self-test, and lecture
    types_found = {m["material_type"] for m in materials}
    assert "video" in types_found, f"Missing video in {types_found}"
    assert "audio" in types_found, f"Missing audio in {types_found}"
    assert "self_test" in types_found, f"Missing self_test in {types_found}"
    assert "lecture" in types_found, f"Missing lecture in {types_found}"

    # Check key items for each material
    for m in materials:
        assert len(m["key_items"]) >= 2, f"Material {m['name']} missing key_items"
        assert m["id"] > 0
