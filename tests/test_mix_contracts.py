import pytest
from pydantic import ValidationError

from app.models.mix import (
    CourseToolsConfig,
    ExamMix,
    ExtensionModuleItem,
    ExtensionSectionPayload,
    ExtensionSyncPayload,
    Flashcard,
    InteractiveBookSection,
    PracticeQuestion,
    QuizSafetyMetadata,
    RawTopicSnapshot,
    TopicMix,
)


def test_quiz_safety_classification_separates_exams_from_self_tests():
    # Unlimited untimed semester-long self test (e.g., history practice)
    self_test = QuizSafetyMetadata(
        name="Self-Test Topic 3 (History)",
        attempts=0,
        timelimit_seconds=0,
        timeopen=1700000000,
        timeclose=1710000000,
        review_correctness_allowed=True,
    )
    assert self_test.classify_safety() == "self_test"

    # Timed, single-attempt exam open for 48 hours -> must be restricted!
    async_exam = QuizSafetyMetadata(
        name="Module Check #1",
        attempts=1,
        timelimit_seconds=2700,
        timeopen=1700000000,
        timeclose=1700172800,
    )
    assert async_exam.classify_safety() == "restricted_exam"

    # Safe Exam Browser quiz -> strictly restricted
    seb_quiz = QuizSafetyMetadata(name="Topic Check", attempts=0, timelimit_seconds=0, requires_seb=True)
    assert seb_quiz.classify_safety() == "restricted_exam"

    # Short 1.5-hour window even without other metadata -> restricted
    short_window = QuizSafetyMetadata(
        name="Quick Check",
        attempts=0,
        timelimit_seconds=0,
        timeopen=1700000000,
        timeclose=1700005400,
    )
    assert short_window.classify_safety() == "restricted_exam"

    # Ambiguous / missing metadata defaults safely (fail-closed)
    ambiguous = QuizSafetyMetadata(name="Quiz 1")
    assert ambiguous.classify_safety() == "restricted_exam"


def test_raw_snapshot_hash_and_privacy_defaults():
    snap = RawTopicSnapshot(
        source_id="mod-101",
        course_id=1048,
        title="Lecture 1: Graphs",
        content_text="A graph G = (V, E) consists of vertices and edges.",
    )
    assert snap.visibility == "private"
    assert snap.source_hash is not None
    assert len(snap.source_hash) == 64

    # Deterministic hash for identical content
    snap2 = RawTopicSnapshot(
        source_id="mod-101-copy",
        course_id=1048,
        title="Lecture 1: Graphs",
        content_text="A graph G = (V, E) consists of vertices and edges.",
    )
    assert snap.source_hash == snap2.source_hash


def test_topic_mix_and_exam_mix_contract_validation():
    tools = CourseToolsConfig()
    assert tools.interactive_book is True
    assert tools.mermaid_diagrams is True
    assert tools.visual_cards is True

    question = PracticeQuestion(
        question="What is the sum of degrees in an undirected graph?",
        options=["|E|", "2|E|", "|V| - 1", "|V|^2"],
        correct_index=1,
        explanation="Handshaking lemma: every edge contributes 2 to total degree sum.",
    )

    topic_mix = TopicMix(
        mix_id="mix-1048-t1",
        course_id=1048,
        topic_index=1,
        title="Graph Theory Basics",
        source_hash="a" * 64,
        tools_enabled=tools,
        book_sections=[
            InteractiveBookSection(
                heading="Handshaking Lemma",
                explanation_markdown="Each edge connects two endpoints...",
                key_takeaways=["Sum of degrees is always even"],
                mermaid_diagram="graph LR; A---B; B---C;",
                visual_card_caption="Undirected Triangle Graph",
            )
        ],
        quizzes=[question],
        flashcards=[Flashcard(front="Degree sum formula", back="2 * |E|")],
    )
    assert topic_mix.visibility == "private"
    assert topic_mix.version == 1

    exam_mix = ExamMix(
        exam_mix_id="exam-1048-final",
        course_id=1048,
        title="Discrete Math Final Mix",
        included_mix_ids=[topic_mix.mix_id],
        master_cheatsheet_markdown="# Cheatsheet\n- Euler formula: V - E + F = 2",
        concept_map_mermaid="mindmap\n  root((Discrete Math))\n    Graphs",
        mock_exam_questions=[question],
        weak_spots_focus=["Planar graphs"],
    )
    assert exam_mix.visibility == "private"
    assert exam_mix.included_mix_ids == ["mix-1048-t1"]

    with pytest.raises(ValidationError):
        PracticeQuestion(
            question="Broken index",
            options=["A", "B"],
            correct_index=5,
            explanation="Out of bounds",
        )


def test_extension_sync_payload_serialization():
    payload = ExtensionSyncPayload(
        authority="ucu",
        moodle_url="https://learn.ucu.edu.ua",
        course_id=1048,
        course_name="Математичний аналіз",
        sections=[
            ExtensionSectionPayload(
                section_index=1,
                title="Тема 1. Границі",
                modules=[
                    ExtensionModuleItem(
                        module_id=501,
                        name="Конспект лекції 1",
                        modname="resource",
                        url="https://learn.ucu.edu.ua/mod/resource/view.php?id=501",
                        file_hashes=["hash123"],
                    )
                ],
            )
        ],
        known_hashes=["oldhash"],
    )
    dumped = payload.model_dump()
    assert dumped["course_id"] == 1048
    assert dumped["sections"][0]["modules"][0]["name"] == "Конспект лекції 1"
