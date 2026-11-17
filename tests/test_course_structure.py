from copy import deepcopy

from app.services.course_structure import build_course_map, canonical_module
from app.services.course_update_matcher import CourseUpdateMatcher
from app.services.moodle_client import MoodleClient
from app.services.submission_status import submission_state


def test_courseformat_keeps_real_parent_and_machine_type():
    state = {"section": [
        {"id": 500, "section": 2, "title": "Part I", "cmlist": [100]},
        {"id": 610, "section": 11, "title": "Topic 3: Conditional probability", "parentsectionid": 500, "cmlist": [101]},
    ], "cm": [
        {"id": 100, "module": "subsection", "modname": "Вкладена секція", "delegatesectionid": 610, "name": "Topic 3: Conditional probability", "sectionid": 500},
        {"id": 101, "module": "lesson", "modname": "Лекція", "name": "A &amp; B", "sectionid": 610, "completionstate": 1},
    ]}
    client = MoodleClient()
    parsed = client._parse_courseformat_state(state, "https://learn.ucu.edu.ua")
    clean = client._enrich_course_sections(parsed, "https://learn.ucu.edu.ua")
    assert clean[1]["moodle_section_id"] == 610
    assert clean[1]["parent_section_id"] == 500
    assert clean[0]["modules"][0]["delegatesectionid"] == 610
    assert clean[0]["modules"][0]["url"] is None
    assert clean[1]["modules"][0]["name"] == "A & B"
    assert clean[1]["modules"][0]["modname"] == "lesson"
    assert clean[1]["modules"][0]["completionstate"] == 1
    tree = build_course_map({"sections": clean})
    assert tree["roots"] == ["moodle-section-500"]
    assert tree["nodes"][1]["parent_id"] == "moodle-section-500"


def test_internal_section_eleven_does_not_steal_topic_eleven():
    matcher = CourseUpdateMatcher([
        {"topic_index": 11, "title": "Topic 3: Conditional probability"},
        {"topic_index": 5, "title": "Topic 11: Hypothesis testing"},
    ])
    result = matcher.match_all_sections([
        {"id": 11, "name": "Topic 3: Conditional probability", "modules": [{"id": 3, "name": "Reading for topic 3"}]},
        {"id": 5, "name": "Topic 11: Hypothesis testing", "modules": [{"id": 11, "name": "Reading for topic 11"}]},
    ])
    assert [m["id"] for m in result["topic_materials"][11]] == [3]
    assert [m["id"] for m in result["topic_materials"][5]] == [11]


def test_unknown_material_is_not_assigned_to_first_topic():
    matcher = CourseUpdateMatcher([{"topic_index": 1, "title": "Trees"}])
    result = matcher.match_all_sections([{"name": "General", "modules": [{"id": 77, "name": "Announcements"}]}])
    assert result["topic_materials"][1] == []
    assert result["unassigned_materials"][0]["id"] == 77


def test_html_nested_sections_do_not_duplicate_activities():
    html = '''<ul class="course-content"><li id="section-2" class="section" data-id="50">
      <h3 class="sectionname">Part I</h3><ul><li class="activity modtype_subsection" id="module-100">
      <a class="aalink">Topic 3</a><ul><li id="section-11" class="section" data-id="60">
      <h4 class="sectionname">Topic 3</h4><ul><li class="activity modtype_resource" id="module-200">
      <a class="aalink" href="/mod/resource/view.php?id=200"><span class="instancename">Lecture</span></a>
      </li></ul></li></ul></li></ul></li></ul>'''
    sections = MoodleClient().parse_moodle_course_html(html, "https://learn.ucu.edu.ua")
    assert len(sections) == 2
    assert sections[1]["parent_section_index"] == 2
    assert sections[1]["name"] == "Topic 3"
    assert [m["id"] for m in sections[0]["modules"]] == [100]
    assert [m["id"] for m in sections[1]["modules"]] == [200]


def test_map_splits_inline_headings_and_keeps_every_resource():
    source = {"sections": [{"id": 3, "name": "Part II: Random variables", "modules": [
        {"id": 1, "modname": "область тексту та медіа", "name": "Topic 4: Discrete variables ..."},
        {"id": 2, "modname": "тека", "name": "Reading 4"},
        {"id": 3, "modname": "label", "name": "Topic 5: Expectation ..."},
        {"id": 4, "modname": "quiz", "name": "Self-test 5", "safety_status": "restricted_exam"},
    ]}]}
    before = deepcopy(source)
    result = build_course_map(source)
    assert len(result["nodes"]) == 3
    assert result["nodes"][0]["children"] == ["section-3-module-1", "section-3-module-3"]
    assert [m["id"] for m in result["nodes"][1]["materials"]] == [1, 2]
    # Quiz metadata/link is navigable, but no assessment questions are read.
    assert [m["id"] for m in result["nodes"][2]["materials"]] == [3, 4]
    assert source == before


def test_repeated_lecture_names_are_not_guessed_into_parents():
    sections = [{"id": i, "name": f"Module {i}", "modules": [{"id": i, "modname": "subsection", "name": "Lecture"}]} for i in [1, 2]]
    sections += [{"id": 11, "name": "Lecture", "modules": []}, {"id": 12, "name": "Lecture", "modules": []}]
    result = build_course_map({"sections": sections})
    assert result["nodes"][2]["parent_id"] is None
    assert result["nodes"][3]["parent_id"] is None


def test_corrupt_old_content_and_placeholder_quizzes_are_not_learning_content():
    mix = {"mix_id": "preserved", "topic_index": 11, "title": "Topic 3: Conditional probability", "user_notes": "Keep me", "book_sections": [
        {"chunk_id": "mod-999", "heading": "Hypothesis testing", "explanation_markdown": "Wrong topic"},
        {"chunk_id": "mod-10", "heading": "Lecture 3", "explanation_markdown": "This interactive unit organizes material from **moodle_api** ..."},
    ], "quizzes": [{"question": "How many core study items were indexed?", "explanation": "stub"}]}
    source = {"sections": [{"id": 11, "name": mix["title"], "modules": [{"id": 10, "name": "Lecture 3", "modname": "lesson"}]}], "topic_mixes": [mix]}
    original = deepcopy(source)
    node = build_course_map(source)["nodes"][0]
    assert node["book_sections"] == []
    assert node["quizzes"] == []
    assert node["mix_id"] == "preserved"
    assert source == original


def test_general_and_syllabus_never_become_recommended_lessons():
    result = build_course_map({"sections": [{"id": 0, "name": "Загальне", "modules": [{"id": 1, "name": "Syllabus", "modname": "resource"}]}]})
    assert result["nodes"][0]["kind"] == "info"
    assert result["nodes"][0]["learnable"] is False


def test_submission_state_requires_explicit_moodle_evidence():
    assert submission_state({"lastattempt": {"submission": {"status": "submitted"}}}) == "submitted"
    assert submission_state({"lastattempt": {"submission": {"status": "draft"}}}) == "draft"
    assert submission_state({"lastattempt": {}}) == "unknown"
    assert submission_state({"is_overdue": True}) == "unknown"


def test_localized_quiz_normalizes_for_existing_safety_rules():
    assert canonical_module({"modname": "Тест", "module": "quiz"}) == "quiz"
    assert canonical_module({"modname": "тест"}) == "quiz"


def test_source_html_keeps_paragraphs_lists_and_inline_word_order():
    from app.services.moodle_client import _FastDOMParser
    parser = _FastDOMParser()
    parser.feed('<div><h3>Bayes</h3><p>Before <b>important</b> after.</p><ul><li>First</li><li>Second</li></ul></div>')
    rendered = parser.root.get_markdown()
    assert 'Before important after.' in rendered
    assert '### Bayes' in rendered
    assert '- First' in rendered and '- Second' in rendered
def test_upload_only_course_keeps_its_existing_topic_reader():
    from app.services.course_structure import build_course_map
    assert build_course_map({"sections": [], "topic_mixes": []}) is None
    assert build_course_map({"course": {"source_type": "manual_upload"}, "sections": [{"id": 1, "name": "Власний текст", "modules": []}], "topic_mixes": []}) is None

