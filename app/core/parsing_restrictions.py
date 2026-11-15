import json
import os
import re
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

from app.models.mix import QuizSafetyMetadata


class SecurityAntiCheatConfig(BaseModel):
    enabled: bool = True
    blocked_exam_keywords: List[str] = Field(default_factory=list)
    allowed_self_test_hints: List[str] = Field(default_factory=list)
    block_if_timelimit_seconds_greater_than: int = 0
    block_if_attempts_limited: bool = True
    block_if_requires_safe_exam_browser: bool = True
    block_if_review_answers_disallowed: bool = True
    block_if_availability_window_seconds_less_than: int = 14400


class UrlRestrictionsConfig(BaseModel):
    blocked_path_patterns: List[str] = Field(default_factory=list)


class ModuleTypeRestrictionsConfig(BaseModel):
    blocked_modnames: List[str] = Field(default_factory=list)
    allowed_modnames: List[str] = Field(default_factory=list)


class FileRestrictionsConfig(BaseModel):
    allowed_extensions: List[str] = Field(default_factory=list)
    blocked_extensions: List[str] = Field(default_factory=list)
    max_file_size_bytes: int = 25 * 1024 * 1024  # 25 MB
    max_total_course_pull_bytes: int = 256 * 1024 * 1024  # 256 MB


class ContentPrivacyFiltersConfig(BaseModel):
    max_text_characters_per_module: int = 60000
    blocked_content_keywords: List[str] = Field(default_factory=list)
    redact_pii_patterns: List[str] = Field(default_factory=list)


class ParsingRestrictions(BaseModel):
    """
    Core policy and restriction engine governing what content, files,
    and URLs cannot be parsed or ingested by the AI workspace.
    """

    version: str = "1.0.0"
    security_and_anti_cheat: SecurityAntiCheatConfig = Field(default_factory=SecurityAntiCheatConfig)
    url_restrictions: UrlRestrictionsConfig = Field(default_factory=UrlRestrictionsConfig)
    module_type_restrictions: ModuleTypeRestrictionsConfig = Field(default_factory=ModuleTypeRestrictionsConfig)
    file_restrictions: FileRestrictionsConfig = Field(default_factory=FileRestrictionsConfig)
    content_and_privacy_filters: ContentPrivacyFiltersConfig = Field(default_factory=ContentPrivacyFiltersConfig)

    def is_url_safe(self, url: Optional[str]) -> Tuple[bool, str]:
        """Check whether a URL is safe to crawl or parse."""
        if not url:
            return True, "No URL provided"

        url_lower = url.lower()
        for pattern in self.url_restrictions.blocked_path_patterns:
            if pattern.lower() in url_lower:
                return False, f"URL matches blocked pattern: '{pattern}'"

        return True, "URL is safe"

    def is_module_safe(
        self,
        name: str,
        modname: str,
        url: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Check whether a course module / activity is allowed to be ingested."""
        # 1. Check URL safety
        if url:
            url_safe, reason = self.is_url_safe(url)
            if not url_safe:
                return False, reason

        # 2. Check blocked module types
        mod_clean = (modname or "").strip().lower()
        if mod_clean in self.module_type_restrictions.blocked_modnames:
            return False, f"Module type '{mod_clean}' is in blocked module types list"

        # 3. Check anti-cheat keywords in title
        name_lower = (name or "").lower()
        has_self_hint = any(h in name_lower for h in self.security_and_anti_cheat.allowed_self_test_hints)
        for kw in self.security_and_anti_cheat.blocked_exam_keywords:
            if kw in name_lower and not has_self_hint:
                return False, f"Title contains blocked exam keyword: '{kw}'"

        return True, "Module is safe"

    def is_file_safe(
        self,
        filename: str,
        url: Optional[str] = None,
        file_size: Optional[int] = None,
    ) -> Tuple[bool, str]:
        """Check whether an attached document / file can be parsed and cached."""
        if not filename:
            return False, "Empty filename"

        # 1. URL check
        if url:
            url_safe, reason = self.is_url_safe(url)
            if not url_safe:
                return False, reason

        # 2. Check extension
        _, ext = os.path.splitext(filename.lower())
        if not ext:
            return False, "File has no extension"

        if ext in self.file_restrictions.blocked_extensions:
            return False, f"Extension '{ext}' is explicitly blocked"

        if self.file_restrictions.allowed_extensions and ext not in self.file_restrictions.allowed_extensions:
            return False, f"Extension '{ext}' is not in allowed document extensions list"

        # 3. Check file size
        if file_size is not None and file_size > self.file_restrictions.max_file_size_bytes:
            mb = file_size / (1024 * 1024)
            limit_mb = self.file_restrictions.max_file_size_bytes / (1024 * 1024)
            return False, f"File size ({mb:.1f}MB) exceeds limit of {limit_mb:.1f}MB"

        # 4. Check keywords in filename
        fname_lower = filename.lower()
        has_self_hint = any(h in fname_lower for h in self.security_and_anti_cheat.allowed_self_test_hints)
        for kw in self.security_and_anti_cheat.blocked_exam_keywords:
            if kw in fname_lower and not has_self_hint:
                return False, f"Filename contains blocked exam keyword: '{kw}'"

        return True, "File is safe"

    def is_quiz_safe(self, quiz_meta: QuizSafetyMetadata) -> Tuple[bool, str]:
        """Fail-closed classifier verifying if a Moodle quiz is safe practice or a restricted exam."""
        if not self.security_and_anti_cheat.enabled:
            return True, "Anti-cheat disabled"

        # Check Safe Exam Browser
        if self.security_and_anti_cheat.quiz_rules.block_if_requires_safe_exam_browser and quiz_meta.requires_seb:
            return False, "Quiz requires Safe Exam Browser (SEB)"

        # Check time limit
        if (
            quiz_meta.timelimit_seconds is not None
            and quiz_meta.timelimit_seconds > self.security_and_anti_cheat.quiz_rules.block_if_timelimit_seconds_greater_than
        ):
            return False, f"Quiz has strict countdown timer ({quiz_meta.timelimit_seconds}s)"

        # Check attempt limits
        if (
            self.security_and_anti_cheat.quiz_rules.block_if_attempts_limited
            and quiz_meta.attempts is not None
            and quiz_meta.attempts > 0
        ):
            return False, f"Quiz limits attempts to {quiz_meta.attempts}"

        # Check hidden review answers
        if (
            self.security_and_anti_cheat.quiz_rules.block_if_review_answers_disallowed
            and quiz_meta.review_correctness_allowed is False
        ):
            return False, "Quiz disallows reviewing correct answers"

        # Check availability window
        if quiz_meta.timeopen and quiz_meta.timeclose:
            window = quiz_meta.timeclose - quiz_meta.timeopen
            if 0 < window <= self.security_and_anti_cheat.quiz_rules.block_if_availability_window_seconds_less_than:
                return False, f"Quiz availability window ({window}s) is under {self.security_and_anti_cheat.quiz_rules.block_if_availability_window_seconds_less_than}s threshold"

        # Check name
        lower_name = quiz_meta.name.lower()
        has_self_hint = any(h in lower_name for h in self.security_and_anti_cheat.allowed_self_test_hints)
        for kw in self.security_and_anti_cheat.blocked_exam_keywords:
            if kw in lower_name and not has_self_hint:
                return False, f"Quiz title matches exam keyword '{kw}'"

        if quiz_meta.attempts == 0 and (quiz_meta.timelimit_seconds is None or quiz_meta.timelimit_seconds == 0):
            return True, "Quiz is an untimed open self-test"

        return False, "Quiz does not satisfy open practice criteria (fail-closed default)"

    def sanitize_text(self, text: str) -> str:
        """Sanitize text by enforcing maximum character lengths and redacting sensitive tokens."""
        if not text:
            return ""

        sanitized = text[: self.content_and_privacy_filters.max_text_characters_per_module]

        # Redact secrets / passwords / tokens
        for pattern in self.content_and_privacy_filters.redact_pii_patterns:
            try:
                sanitized = re.sub(pattern, "[REDACTED_SECRET]", sanitized)
            except Exception:
                pass

        return sanitized


@lru_cache(maxsize=1)
def get_parsing_restrictions(config_path: Optional[str] = None) -> ParsingRestrictions:
    """Load parsing restrictions from JSON file or return defaults."""
    if not config_path:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(base_dir, "parsing_rules.json")

    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            sec = data.get("security_and_anti_cheat", {})
            q_rules = sec.get("quiz_safety_rules", {})
            sec_config = SecurityAntiCheatConfig(
                enabled=sec.get("enabled", True),
                blocked_exam_keywords=sec.get("blocked_exam_keywords", []),
                allowed_self_test_hints=sec.get("allowed_self_test_hints", []),
                block_if_timelimit_seconds_greater_than=q_rules.get("block_if_timelimit_seconds_greater_than", 0),
                block_if_attempts_limited=q_rules.get("block_if_attempts_limited", True),
                block_if_requires_safe_exam_browser=q_rules.get("block_if_requires_safe_exam_browser", True),
                block_if_review_answers_disallowed=q_rules.get("block_if_review_answers_disallowed", True),
                block_if_availability_window_seconds_less_than=q_rules.get("block_if_availability_window_seconds_less_than", 14400),
            )

            urls = data.get("url_restrictions", {})
            url_config = UrlRestrictionsConfig(
                blocked_path_patterns=urls.get("blocked_path_patterns", [])
            )

            mods = data.get("module_type_restrictions", {})
            mod_config = ModuleTypeRestrictionsConfig(
                blocked_modnames=mods.get("blocked_modnames", []),
                allowed_modnames=mods.get("allowed_modnames", []),
            )

            files = data.get("file_restrictions", {})
            file_config = FileRestrictionsConfig(
                allowed_extensions=files.get("allowed_extensions", []),
                blocked_extensions=files.get("blocked_extensions", []),
                max_file_size_bytes=files.get("max_file_size_bytes", 25 * 1024 * 1024),
                max_total_course_pull_bytes=files.get("max_total_course_pull_bytes", 256 * 1024 * 1024),
            )

            content = data.get("content_and_privacy_filters", {})
            content_config = ContentPrivacyFiltersConfig(
                max_text_characters_per_module=content.get("max_text_characters_per_module", 60000),
                blocked_content_keywords=content.get("blocked_content_keywords", []),
                redact_pii_patterns=content.get("redact_pii_patterns", []),
            )

            return ParsingRestrictions(
                version=data.get("version", "1.0.0"),
                security_and_anti_cheat=sec_config,
                url_restrictions=url_config,
                module_type_restrictions=mod_config,
                file_restrictions=file_config,
                content_and_privacy_filters=content_config,
            )
        except Exception:
            pass

    return ParsingRestrictions()
