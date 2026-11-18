import pytest

from app.services.mix_generator import generate_course_structure_from_syllabus
from app.services.text_analyzer import CurriculumConceptParser, ADMINISTRATIVE_WORDS


USER_SAMPLE_CURRICULUM = """
#Topic 4
#Reading for topic 4
#Discrete random variables
#Quiz 4
#Self
#test on Topic 4
#Seminar 4
#Topic 5
#Reading for topic 5
#Expectation
#Quiz 5
#test on topic 5
#Seminar 5
#Topic 6
#Reading for topic 6
#Continuous random variables
#Quiz 6
#test 6
#Seminar 6
#Colloquium
#midterm exam
#Lab assignment 2
#test for module 2
#Colloquium 2
#Midterm exam 2
#part ii: random variables
#тиждень 4
#week 4
#тема 4
"""


def test_is_administrative_label_filters_noise():
    labels = [
        "#Topic 4",
        "#Reading for topic 4",
        "#Quiz 4",
        "Self-test on Topic 4",
        "#Seminar 4",
        "#Topic 5",
        "Reading for topic 5",
        "Quiz 5",
        "test on topic 5",
        "Seminar 5",
        "Colloquium",
        "midterm exam",
        "Lab assignment 2",
        "test for module 2",
        "Colloquium 2",
        "Midterm exam 2",
        "#part ii: random variables",
        "#тиждень 4",
        "#week 4",
        "#тема 4",
    ]
    for label in labels:
        assert CurriculumConceptParser.is_administrative_label(label) is True, f"Failed for {label}"


def test_substantive_concepts_are_not_flagged_as_labels():
    real_concepts = [
        "Discrete random variables",
        "Expectation",
        "Continuous random variables",
        "Linear regression",
        "Sorting algorithms",
        "Binary search trees",
    ]
    for concept in real_concepts:
        assert CurriculumConceptParser.is_administrative_label(concept) is False, f"Flagged real concept {concept}"


def test_parse_curriculum_text_extracts_real_concepts():
    topics = CurriculumConceptParser.parse_curriculum_text(USER_SAMPLE_CURRICULUM, target_score=85)

    assert len(topics) == 3, f"Expected 3 topics, got {len(topics)}"

    # Topic 4: Discrete random variables
    t4 = next((t for t in topics if t["topic_index"] == 4), None)
    assert t4 is not None
    assert "Discrete Random Variables" in t4["title"] or "Дискретні випадкові величини" in t4["title"]
    assert "topic 4" not in t4["title"].lower() or "discrete" in t4["title"].lower()

    # Topic 5: Expectation
    t5 = next((t for t in topics if t["topic_index"] == 5), None)
    assert t5 is not None
    assert "Expectation" in t5["title"] or "Математичне сподівання" in t5["title"]

    # Topic 6: Continuous random variables
    t6 = next((t for t in topics if t["topic_index"] == 6), None)
    assert t6 is not None
    assert "Continuous Random Variables" in t6["title"] or "Неперервні випадкові величини" in t6["title"]

    # Strict check: Keywords and key_concepts must NOT contain administrative words
    for t in topics:
        for kw in t["keywords"]:
            assert kw.lower() not in ADMINISTRATIVE_WORDS, f"Found administrative word in keywords: {kw}"
        for kc in t["key_concepts"]:
            assert "quiz" not in kc.lower()
            assert "reading for" not in kc.lower()
            assert "seminar" not in kc.lower()


@pytest.mark.asyncio
async def test_generate_course_structure_from_user_syllabus():
    preview = await generate_course_structure_from_syllabus(
        course_id=205,
        title="Probability & Statistics",
        shortname="STAT205",
        authority="ucu",
        target_score=85,
        custom_syllabus_text=USER_SAMPLE_CURRICULUM,
    )

    assert len(preview.topics) == 3
    titles = [t.title for t in preview.topics]

    # Verify each topic title is derived from real concepts
    assert any("Discrete" in title or "Дискретні" in title for title in titles)
    assert any("Expectation" in title or "сподівання" in title for title in titles)
    assert any("Continuous" in title or "Неперервні" in title for title in titles)

    for t in preview.topics:
        # None of the titles should be just administrative labels
        assert t.title not in ("Тема 4: Topic 4", "Тема 5: Topic 5", "Тема 6: Topic 6")
        for kw in t.keywords:
            assert kw.lower() not in ADMINISTRATIVE_WORDS


def test_extract_concept_from_section_with_administrative_header():
    # If Moodle section title is generic 'Topic 4'
    section = {
        "id": 104,
        "name": "Topic 4",
        "modules": [
            {"id": 1, "name": "Reading for topic 4", "modname": "resource"},
            {"id": 2, "name": "Discrete random variables", "modname": "resource"},
            {"id": 3, "name": "Quiz 4", "modname": "quiz"},
            {"id": 4, "name": "Seminar 4", "modname": "assign"},
        ],
    }

    concept = CurriculumConceptParser.extract_concept_from_section(section, default_index=4)
    assert concept == "Discrete random variables"
