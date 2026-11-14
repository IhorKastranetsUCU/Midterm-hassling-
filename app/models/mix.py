import hashlib
from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

VisibilityScope = Literal["private", "course_shared"]
IngestionSourceType = Literal["moodle_extension", "moodle_api", "manual_upload"]
ExamSafetyClassification = Literal["safe_material", "self_test", "restricted_exam"]

_SELF_TEST_HINTS = ("self", "practice", "тренувал", "самоперевірк", "пробн")
_RESTRICTED_EXAM_HINTS = ("іспит", "екзамен", "контрольн", "модульн", "midterm", "final")
_SHORT_WINDOW_SECONDS = 4 * 3600  # 4 hours


def compute_content_hash(content: str) -> str:
    """Return a deterministic SHA-256 hex digest for source deduplication and diff detection."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


class CourseToolsConfig(BaseModel):
    """Per-course generation toggles chosen before building AI study artifacts."""

    interactive_book: bool = True
    mermaid_diagrams: bool = True
    visual_cards: bool = True
    practice_quizzes: bool = True
    flashcards: bool = False
    exam_mix: bool = True
    deadline_tracker: bool = True


class QuizSafetyMetadata(BaseModel):
    """Metadata describing a Moodle quiz to prevent accidental exam/answer ingestion."""

    name: str
    attempts: Optional[int] = Field(None, description="0 means unlimited attempts; >=1 indicates capped attempts")
    timelimit_seconds: Optional[int] = Field(None, description="0 means untimed; >0 indicates strict timer")
    timeopen: Optional[int] = None
    timeclose: Optional[int] = None
    grade_max: Optional[float] = None
    requires_seb: bool = False
    review_correctness_allowed: Optional[bool] = None

    def classify_safety(self) -> ExamSafetyClassification:
        """Fail-closed classifier separating open self-tests from restricted graded exams."""
        if self.requires_seb:
            return "restricted_exam"
        if self.timelimit_seconds is not None and self.timelimit_seconds > 0:
            return "restricted_exam"
        if self.attempts is not None and self.attempts > 0:
            return "restricted_exam"
        if self.review_correctness_allowed is False:
            return "restricted_exam"

        if self.timeopen is not None and self.timeclose is not None:
            window = self.timeclose - self.timeopen
            if 0 < window <= _SHORT_WINDOW_SECONDS:
                return "restricted_exam"

        lower_name = self.name.lower()
        has_self_hint = any(hint in lower_name for hint in _SELF_TEST_HINTS)
        has_exam_hint = any(hint in lower_name for hint in _RESTRICTED_EXAM_HINTS)
        if has_exam_hint and not has_self_hint:
            return "restricted_exam"

        # Allow open practice only when unlimited attempts & untimed are explicitly confirmed.
        if self.attempts == 0 and (self.timelimit_seconds is None or self.timelimit_seconds == 0):
            return "self_test"

        return "restricted_exam"


class RawTopicSnapshot(BaseModel):
    """Normalized, immutable snapshot of ingested course material before AI synthesis."""

    source_id: str
    course_id: int
    authority: str = "ucu"
    title: str
    content_text: str
    source_type: IngestionSourceType = "moodle_extension"
    source_hash: Optional[str] = None
    safety_status: ExamSafetyClassification = "safe_material"
    visibility: VisibilityScope = "private"

    @model_validator(mode="after")
    def ensure_source_hash(self) -> "RawTopicSnapshot":
        if not self.source_hash:
            self.source_hash = compute_content_hash(f"{self.title}\n{self.content_text}")
        return self


class InteractiveBookSection(BaseModel):
    """Structured interactive textbook unit with optional Mermaid diagram and visual card."""

    heading: str
    explanation_markdown: str
    key_takeaways: List[str] = Field(default_factory=list)
    mermaid_diagram: Optional[str] = None
    visual_card_caption: Optional[str] = None
    visual_card_prompt: Optional[str] = None
    visual_card_url: Optional[str] = None


class PracticeQuestion(BaseModel):
    """Synthetic practice question generated from lecture content (never scraped exam items)."""

    question: str
    options: List[str] = Field(min_length=2)
    correct_index: int = Field(ge=0)
    explanation: str
    topic_ref: Optional[str] = None

    @model_validator(mode="after")
    def validate_correct_index(self) -> "PracticeQuestion":
        if self.correct_index >= len(self.options):
            raise ValueError("correct_index must be within options range.")
        return self


class Flashcard(BaseModel):
    """Spaced-repetition study card derived from a topic."""

    front: str
    back: str
    tag: Optional[str] = None


class TopicMix(BaseModel):
    """Level 1 AI artifact for a single course topic, preserving user notes across upstream updates."""

    mix_id: str
    course_id: int
    authority: str = "ucu"
    topic_index: int = 0
    title: str
    source_hash: str
    version: int = 1
    visibility: VisibilityScope = "private"
    tools_enabled: CourseToolsConfig = Field(default_factory=CourseToolsConfig)
    book_sections: List[InteractiveBookSection] = Field(default_factory=list)
    quizzes: List[PracticeQuestion] = Field(default_factory=list)
    flashcards: List[Flashcard] = Field(default_factory=list)
    user_notes: Optional[str] = None
    has_upstream_update: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExamMix(BaseModel):
    """Level 2 cross-topic synthesis ('Mix of Mixes') built from TopicMix summaries for exam prep."""

    exam_mix_id: str
    course_id: int
    authority: str = "ucu"
    title: str
    included_mix_ids: List[str] = Field(default_factory=list)
    master_cheatsheet_markdown: str = ""
    concept_map_mermaid: Optional[str] = None
    mock_exam_questions: List[PracticeQuestion] = Field(default_factory=list)
    weak_spots_focus: List[str] = Field(default_factory=list)
    visibility: VisibilityScope = "private"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExtensionModuleItem(BaseModel):
    """Single course activity/resource captured by the browser extension in Moodle DOM."""

    module_id: int
    name: str
    modname: str
    url: Optional[str] = None
    text_excerpt: Optional[str] = None
    file_hashes: List[str] = Field(default_factory=list)
    quiz_meta: Optional[QuizSafetyMetadata] = None


class ExtensionSectionPayload(BaseModel):
    """Course topic/section payload sent by the Chrome Extension."""

    section_index: int
    title: str
    summary: Optional[str] = None
    modules: List[ExtensionModuleItem] = Field(default_factory=list)


class ExtensionSyncPayload(BaseModel):
    """Contract between the Browser Extension and Backend ingestion endpoint."""

    authority: str = "ucu"
    moodle_url: str
    course_id: int
    course_name: str
    course_shortname: Optional[str] = None
    sections: List[ExtensionSectionPayload] = Field(default_factory=list)
    known_hashes: List[str] = Field(default_factory=list)
    tools_config: Optional[CourseToolsConfig] = None


class BlockedQuizNotice(BaseModel):
    """Transparent audit record for exams blocked from AI/content storage by safety policy."""

    name: str
    reason: str = "Restricted exam/graded quiz excluded by Academic Integrity Policy"
    classification: ExamSafetyClassification = "restricted_exam"


class WorkspaceCourseSummary(BaseModel):
    """Metadata summary for a synced or uploaded course workspace."""

    course_id: int
    authority: str = "ucu"
    title: str
    shortname: str = "COURSE"
    moodle_url: str = ""
    source_type: IngestionSourceType = "moodle_extension"
    visibility: VisibilityScope = "private"
    tools_config: CourseToolsConfig = Field(default_factory=CourseToolsConfig)
    topic_count: int = 0
    has_exam_mix: bool = False
    updates_pending: int = 0
    blocked_quizzes_count: int = 0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
