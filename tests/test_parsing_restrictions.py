import pytest
from app.core.parsing_restrictions import get_parsing_restrictions, ParsingRestrictions
from app.services.moodle_client import MoodleClient
from app.models.mix import QuizSafetyMetadata


def test_parsing_restrictions_rules_loaded():
    restrictions = get_parsing_restrictions()
    assert isinstance(restrictions, ParsingRestrictions)
    assert restrictions.version == "1.0.0"
    assert "іспит" in restrictions.security_and_anti_cheat.blocked_exam_keywords
    assert "midterm" in restrictions.security_and_anti_cheat.blocked_exam_keywords
    assert ".pdf" in restrictions.file_restrictions.allowed_extensions
    assert ".exe" in restrictions.file_restrictions.blocked_extensions


def test_module_safety_classification():
    restrictions = get_parsing_restrictions()

    # Safe lecture resource
    safe, _ = restrictions.is_module_safe("Лекція 1: Вступ до алгоритмів", "resource", "https://learn.ucu.edu.ua/mod/resource/view.php?id=101")
    assert safe is True

    # Exam keyword in title
    safe_exam, reason = restrictions.is_module_safe("Фінальний іспит з матана", "resource", "https://learn.ucu.edu.ua/mod/resource/view.php?id=102")
    assert safe_exam is False
    assert "іспит" in reason

    # Midterm keyword in title
    safe_mid, reason_mid = restrictions.is_module_safe("Midterm 2 - Colloquium", "quiz", "https://learn.ucu.edu.ua/mod/quiz/view.php?id=103")
    assert safe_mid is False
    assert "midterm" in reason_mid

    # Self-test hint overrides exam keyword
    safe_self, _ = restrictions.is_module_safe("Тренувальний тест до іспиту", "quiz", "https://learn.ucu.edu.ua/mod/quiz/view.php?id=104")
    assert safe_self is True

    # Blocked module type
    safe_chat, reason_chat = restrictions.is_module_safe("Студентський чат", "chat")
    assert safe_chat is False
    assert "chat" in reason_chat

    # Blocked URL path
    safe_url, reason_url = restrictions.is_module_safe("Quiz Attempt", "quiz", "https://learn.ucu.edu.ua/mod/quiz/attempt.php?id=50")
    assert safe_url is False
    assert "attempt.php" in reason_url


def test_file_safety_classification():
    restrictions = get_parsing_restrictions()

    # Allowed document
    f_safe, _ = restrictions.is_file_safe("lecture_slides.pdf", "https://learn.ucu.edu.ua/pluginfile.php/1/slides.pdf", 1024 * 1024)
    assert f_safe is True

    # Blocked binary executable
    f_exe, r_exe = restrictions.is_file_safe("malware.exe", "https://learn.ucu.edu.ua/files/malware.exe", 1024)
    assert f_exe is False
    assert ".exe" in r_exe

    # File size limit
    oversized = 30 * 1024 * 1024  # 30MB
    f_big, r_big = restrictions.is_file_safe("huge_book.pdf", "https://learn.ucu.edu.ua/book.pdf", oversized)
    assert f_big is False
    assert "exceeds limit" in r_big


def test_text_sanitizer_redaction():
    restrictions = get_parsing_restrictions()
    text = "Student login info: password = mySuperSecretPass and bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz"
    sanitized = restrictions.sanitize_text(text)
    assert "mySuperSecretPass" not in sanitized
    assert "[REDACTED_SECRET]" in sanitized


def test_moodle_html_fallback_parsing():
    client = MoodleClient()
    sample_html = """
    <div class="course-content">
      <ul class="topics">
        <li id="section-0" class="section main">
          <h3 class="sectionname"><span>Syllabus & Introduction</span></h3>
          <div class="summary"><p>Overview</p></div>
          <li class="activity resource modtype_resource" id="module-501">
            <a class="aalink" href="https://learn.ucu.edu.ua/mod/resource/view.php?id=501">
              <span class="instancename">Course_Guide.pdf<span class="accesshide"> File</span></span>
            </a>
            <a href="https://learn.ucu.edu.ua/pluginfile.php/501/mod_resource/content/1/Course_Guide.pdf">Download</a>
          </li>
          <li class="activity quiz modtype_quiz" id="module-502">
            <a class="aalink" href="https://learn.ucu.edu.ua/mod/quiz/view.php?id=502">
              <span class="instancename">Final Exam 2026</span>
            </a>
          </li>
        </li>
      </ul>
    </div>
    """
    sections = client.parse_moodle_course_html(sample_html, base_url="https://learn.ucu.edu.ua")
    assert len(sections) == 1
    sec = sections[0]
    assert sec["name"] == "Syllabus & Introduction"
    assert len(sec["modules"]) == 2

    mod1 = sec["modules"][0]
    assert mod1["name"] == "Course_Guide.pdf"
    assert mod1["modname"] == "resource"
    assert len(mod1["contents"]) > 0

    enriched = client._enrich_course_sections(sections, "https://learn.ucu.edu.ua")
    assert enriched[0]["modules"][0]["safety_status"] == "safe_material"
    assert enriched[0]["modules"][1]["safety_status"] == "restricted_exam"


def test_moodle_remui_and_courseformat_state_parsing():
    client = MoodleClient()
    remui_html = """
    <div class="course-content">
      <section id="section-1" class="course-section section main" data-sectionid="101" data-sectionname="Topic 1: Foundations">
        <h3 class="sectionname course-content-item">
          <a href="#">Topic 1: Foundations</a>
        </h3>
        <div class="summary"><p>Introduction to the module</p></div>
        <ul class="section img-text">
          <li class="activity activity-item resource modtype_resource" id="module-201">
            <div class="activity-basis d-flex align-items-center">
              <div class="activity-instance d-flex flex-column">
                <div class="activitytitle media">
                  <div class="activityname">
                    <a href="https://learn.ucu.edu.ua/mod/resource/view.php?id=201" class="aalink text-truncate">
                      <span class="media-body activity-title">Lecture 1 - Architecture Overview</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </li>
          <li class="activity activity-item url modtype_url" id="module-202">
            <a href="https://learn.ucu.edu.ua/mod/url/view.php?id=202" class="aalink">
              <span class="instancename">Course GitHub Repo</span>
            </a>
          </li>
        </ul>
      </section>
    </div>
    """
    sections = client.parse_moodle_course_html(remui_html, base_url="https://learn.ucu.edu.ua")
    assert len(sections) == 1
    assert sections[0]["name"] == "Topic 1: Foundations"
    assert len(sections[0]["modules"]) == 2
    assert sections[0]["modules"][0]["name"] == "Lecture 1 - Architecture Overview"
    assert sections[0]["modules"][0]["url"] == "https://learn.ucu.edu.ua/mod/resource/view.php?id=201"

    # Test Moodle 4 AJAX courseformat state parsing
    state = {
        "course": {"id": 123},
        "section": [
            {"id": 1, "section": 0, "title": "Introduction & Syllabus", "cmlist": [10, 11]},
            {"id": 2, "section": 1, "title": "Week 1 - Foundations", "cmlist": [12]},
        ],
        "cm": [
            {"id": 10, "name": "Course Syllabus", "modname": "resource", "url": "https://learn.ucu.edu.ua/mod/resource/view.php?id=10"},
            {"id": 11, "name": "Intro Quiz", "modname": "quiz", "url": "https://learn.ucu.edu.ua/mod/quiz/view.php?id=11"},
            {"id": 12, "name": "Lecture 1 PDF", "modname": "resource", "url": "https://learn.ucu.edu.ua/mod/resource/view.php?id=12"},
        ],
    }
    state_sections = client._parse_courseformat_state(state, "https://learn.ucu.edu.ua")
    assert len(state_sections) == 2
    assert len(state_sections[0]["modules"]) == 2
    assert len(state_sections[1]["modules"]) == 1

