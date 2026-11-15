import asyncio
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import build_queue as bq_module
from app.services import workspace_store as ws_module
from app.services.build_queue import DebouncedBuildQueue
from app.services.workspace_store import WorkspaceStore


@pytest.fixture()
def isolated_store(tmp_path, monkeypatch):
    db_file = tmp_path / "test_workspace.db"
    store = WorkspaceStore(db_path=str(db_file))
    fresh_queue = DebouncedBuildQueue()
    monkeypatch.setattr(ws_module, "_store_instance", store)
    monkeypatch.setattr("app.routers.workspace.get_workspace_store", lambda: store)
    monkeypatch.setattr(bq_module, "_build_queue", fresh_queue)
    yield store
    fresh_queue.cancel_all()


def test_extension_sync_exam_shield_and_note_preserving_diff(isolated_store):
    client = TestClient(app)

    initial_payload = {
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 1048,
        "course_name": "Discrete Mathematics",
        "course_shortname": "DM-1048",
        "sections": [
            {
                "section_index": 0,
                "title": "Topic 1: Graph Theory",
                "summary": "Vertices, edges, handshaking lemma",
                "modules": [
                    {
                        "module_id": 101,
                        "name": "Lecture 1 Slides",
                        "modname": "resource",
                        "url": "https://learn.ucu.edu.ua/mod/resource/view.php?id=101",
                        "text_excerpt": "Sum of vertex degrees equals twice the edge count",
                    },
                    {
                        "module_id": 102,
                        "name": "Self-Test Graph Basics",
                        "modname": "quiz",
                        "quiz_meta": {
                            "name": "Self-Test Graph Basics",
                            "attempts": 0,
                            "timelimit_seconds": 0,
                            "review_correctness_allowed": True,
                        },
                    },
                ],
            },
            {
                "section_index": 1,
                "title": "Topic 2: Midterms",
                "modules": [
                    {
                        "module_id": 201,
                        "name": "Midterm Exam #1",
                        "modname": "quiz",
                        "quiz_meta": {
                            "name": "Midterm Exam #1",
                            "attempts": 1,
                            "timelimit_seconds": 2700,
                        },
                    },
                    {
                        "module_id": 202,
                        "name": "Mystery Quiz",
                        "modname": "quiz",
                    },
                ],
            },
        ],
    }

    sync_res = client.post("/api/sync/extension", json=initial_payload)
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["success"] is True
    assert sync_data["workspace_url"] == "/ucu/courses/1048"
    assert sync_data["summary"]["new_topics"] == 2
    assert sync_data["summary"]["blocked_exams"] == 2

    # Verify workspace course bundle (ExamMix is lazy until opened/requested)
    bundle_res = client.get("/api/workspace/courses/1048")
    assert bundle_res.status_code == 200
    bundle = bundle_res.json()
    assert bundle["course"]["title"] == "Discrete Mathematics"
    assert len(bundle["topic_mixes"]) == 2
    assert len(bundle["blocked_quizzes"]) == 2
    assert bundle["exam_mix"] is None
    assert bundle["course"]["exam_mix_stale"] is True

    exam_res = client.post("/api/workspace/courses/1048/exam-mix")
    assert exam_res.status_code == 200
    exam_data = exam_res.json()["exam_mix"]
    assert "flowchart LR" in exam_data["concept_map_mermaid"]

    first_mix = bundle["topic_mixes"][0]
    mix_id = first_mix["mix_id"]
    assert len(first_mix["book_sections"]) >= 1
    assert "flowchart TD" in first_mix["book_sections"][0]["mermaid_diagram"]

    # Save personal student notes
    note_text = "Remember Euler formula: V - E + F = 2"
    note_res = client.patch(f"/api/workspace/mixes/{mix_id}/notes", json={"notes": note_text})
    assert note_res.status_code == 200
    assert note_res.json()["user_notes"] == note_text

    # Identical re-sync -> 0 changes
    res_same = client.post("/api/sync/extension", json=initial_payload)
    assert res_same.status_code == 200
    assert res_same.json()["summary"]["unchanged_topics"] == 2
    assert res_same.json()["summary"]["updated_topics"] == 0

    # Upstream change on Topic 1 -> marks update available without erasing notes
    updated_payload = {
        **initial_payload,
        "sections": [
            {
                **initial_payload["sections"][0],
                "summary": "Vertices, edges, planar graphs, Euler theorem",
            },
            initial_payload["sections"][1],
        ],
    }
    res_diff = client.post("/api/sync/extension", json=updated_payload)
    assert res_diff.status_code == 200
    assert res_diff.json()["summary"]["updated_topics"] == 1

    mid_bundle = client.get("/api/workspace/courses/1048").json()
    assert mid_bundle["topic_mixes"][0]["has_upstream_update"] is True
    assert mid_bundle["topic_mixes"][0]["user_notes"] == note_text

    # Apply update -> increments version and keeps personal notes
    ack_res = client.post(f"/api/workspace/mixes/{mix_id}/ack-update")
    assert ack_res.status_code == 200
    acked = ack_res.json()["mix"]
    assert acked["version"] == 2
    assert acked["has_upstream_update"] is False
    assert acked["user_notes"] == note_text


def test_file_upload_tools_update_and_course_page(isolated_store):
    client = TestClient(app)

    tools_json = (
        '{"interactive_book": true, "mermaid_diagrams": true, '
        '"visual_cards": true, "practice_quizzes": true, '
        '"flashcards": true, "exam_mix": true, "deadline_tracker": true}'
    )
    upload_res = client.post(
        "/api/workspace/courses/upload",
        data={
            "course_title": "Algorithms & Data Structures",
            "shortname": "ADS-202",
            "authority": "custom",
            "tools_json": tools_json,
        },
        files={"file": ("lecture1.md", b"# Binary Trees\nEach node has up to 2 children.\nBalanced AVL trees stay O(log n).", "text/markdown")},
    )
    assert upload_res.status_code == 200
    up_data = upload_res.json()
    cid = up_data["course_id"]
    assert up_data["workspace_url"] == f"/custom/courses/{cid}"

    # Verify list endpoint & standalone course page HTML
    list_res = client.get("/api/workspace/courses")
    assert list_res.status_code == 200
    assert any(c["course_id"] == cid for c in list_res.json())

    html_res = client.get(f"/custom/courses/{cid}")
    assert html_res.status_code == 200
    assert "mermaid" in html_res.text

    # Toggle off mermaid diagrams via tools endpoint
    put_res = client.put(
        f"/api/workspace/courses/{cid}/tools",
        json={
            "interactive_book": True,
            "mermaid_diagrams": False,
            "visual_cards": False,
            "practice_quizzes": True,
            "flashcards": True,
            "exam_mix": True,
            "deadline_tracker": True,
        },
    )
    assert put_res.status_code == 200

    updated_bundle = client.get(f"/api/workspace/courses/{cid}").json()
    assert updated_bundle["topic_mixes"][0]["book_sections"][0]["mermaid_diagram"] is None
    assert len(updated_bundle["topic_mixes"][0]["flashcards"]) >= 1

    # Delete course cleanly
    del_res = client.delete(f"/api/workspace/courses/{cid}")
    assert del_res.status_code == 200
    assert client.get(f"/api/workspace/courses/{cid}").status_code == 404


def test_favicon_and_unknown_authority_do_not_crash():
    client = TestClient(app)

    fav_res = client.get("/favicon.ico")
    assert fav_res.status_code == 204

    unknown_res = client.get("/unknown-university-slug")
    assert unknown_res.status_code == 404


@pytest.mark.asyncio
async def test_event_monitor_scan_uses_course_id_per_course():
    from app.services.event_monitor import EventMonitorService

    captured_course_ids = []

    class FakeMoodleClient:
        async def get_user_courses(self, **kwargs):
            return [{"id": 101, "shortname": "CS-101"}]

        async def get_assignments(self, **kwargs):
            return {"courses": []}

        async def get_user_grades(self, **kwargs):
            assert "course_ids" not in kwargs
            captured_course_ids.append(kwargs["course_id"])
            return {
                "usergrades": [
                    {
                        "courseid": kwargs["course_id"],
                        "gradeitems": [
                            {"itemname": "Lab 1", "gradeformatted": "95.00"}
                        ],
                    }
                ]
            }

    monitor = EventMonitorService()
    await monitor.scan_user_events(user_id=42, client=FakeMoodleClient(), token="tok")
    assert captured_course_ids == [101]
    assert monitor._user_state[42]["grades"]["101_Lab 1"] == "95.00"


def test_user_isolation_guests_cannot_read_or_overwrite_same_course(isolated_store):
    client_a = TestClient(app)
    client_b = TestClient(app)

    payload = {
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 1048,
        "course_name": "Operating Systems",
        "course_shortname": "OS-1048",
        "sections": [
            {
                "section_index": 0,
                "title": "Processes & Threads",
                "summary": "Scheduling and context switching",
                "modules": [
                    {
                        "module_id": 501,
                        "name": "Lecture 1 Slides",
                        "modname": "resource",
                        "text_excerpt": "PCB stores registers and memory map",
                    }
                ],
            }
        ],
    }

    # Client A syncs course 1048 and writes private notes
    res_a = client_a.post("/api/sync/extension", json=payload)
    assert res_a.status_code == 200
    bundle_a = client_a.get("/api/workspace/courses/1048").json()
    mix_id_a = bundle_a["topic_mixes"][0]["mix_id"]
    assert client_a.patch(
        f"/api/workspace/mixes/{mix_id_a}/notes",
        json={"notes": "User A confidential exam tip"},
    ).status_code == 200

    # Client B starts isolated: empty list and 404 on Client A's course & mix
    assert client_b.get("/api/workspace/courses").json() == []
    assert client_b.get("/api/workspace/courses/1048").status_code == 404
    assert client_b.patch(
        f"/api/workspace/mixes/{mix_id_a}/notes",
        json={"notes": "Tampered by B"},
    ).status_code == 404
    assert client_b.post(f"/api/workspace/mixes/{mix_id_a}/ack-update").status_code == 404
    assert client_b.delete("/api/workspace/courses/1048").status_code == 404

    # Client B syncs the exact same Moodle course_id and content hash -> separate private workspace
    res_b = client_b.post("/api/sync/extension", json=payload)
    assert res_b.status_code == 200
    bundle_b = client_b.get("/api/workspace/courses/1048").json()
    mix_id_b = bundle_b["topic_mixes"][0]["mix_id"]
    assert client_b.patch(
        f"/api/workspace/mixes/{mix_id_b}/notes",
        json={"notes": "User B personal note"},
    ).status_code == 200

    # Verify both tenants retained independent notes cleanly
    recheck_a = client_a.get("/api/workspace/courses/1048").json()
    recheck_b = client_b.get("/api/workspace/courses/1048").json()
    assert recheck_a["topic_mixes"][0]["user_notes"] == "User A confidential exam tip"
    assert recheck_b["topic_mixes"][0]["user_notes"] == "User B personal note"


def test_moodle_user_isolation_and_extension_session_token(isolated_store):
    from app.config import get_settings
    from app.core.security import create_session_jwt

    settings = get_settings()
    jwt_u1 = create_session_jwt(
        {
            "sub": "student_one",
            "user_id": 1001,
            "fullname": "Student One",
            "site_url": "https://learn.ucu.edu.ua",
            "moodle_token": "tok1",
        },
        settings,
    )
    jwt_u2 = create_session_jwt(
        {
            "sub": "student_two",
            "user_id": 2002,
            "fullname": "Student Two",
            "site_url": "https://learn.ucu.edu.ua",
            "moodle_token": "tok2",
        },
        settings,
    )

    browser_u1 = TestClient(app)
    browser_u1.cookies.set(settings.COOKIE_NAME, jwt_u1)
    sess_res = browser_u1.get("/api/workspace/session")
    assert sess_res.status_code == 200
    sess_data = sess_res.json()
    assert sess_data["auth_mode"] == "moodle"
    assert sess_data["owner_id"] == "moodle:learn.ucu.edu.ua:1001"
    ext_token = sess_data["workspace_token"]

    # Extension worker sends ONLY X-Workspace-Token (no Moodle cookie!) -> lands inside User 1001 workspace
    ext_worker = TestClient(app)
    up_res = ext_worker.post(
        "/api/workspace/courses/create-text",
        headers={"X-Workspace-Token": ext_token},
        json={"title": "Linear Algebra", "content_text": "Eigenvalues satisfy det(A - lambda I) = 0"},
    )
    assert up_res.status_code == 200
    assert up_res.json()["owner_id"] == "moodle:learn.ucu.edu.ua:1001"
    u1_courses = browser_u1.get("/api/workspace/courses").json()
    assert len(u1_courses) == 1
    assert u1_courses[0]["title"] == "Linear Algebra"

    # Second Moodle user sees empty list and cannot open User 1001's course
    browser_u2 = TestClient(app)
    browser_u2.cookies.set(settings.COOKIE_NAME, jwt_u2)
    assert browser_u2.get("/api/workspace/courses").json() == []
    assert browser_u2.get(f"/api/workspace/courses/{u1_courses[0]['course_id']}").status_code == 404


def test_legacy_workspace_db_auto_migrates_without_leaking(tmp_path):
    import sqlite3

    legacy_db = tmp_path / "legacy_workspace.db"
    with sqlite3.connect(str(legacy_db)) as conn:
        conn.executescript(
            """
            CREATE TABLE workspace_courses (
                course_id INTEGER PRIMARY KEY,
                authority TEXT NOT NULL,
                title TEXT NOT NULL,
                shortname TEXT NOT NULL,
                moodle_url TEXT NOT NULL,
                source_type TEXT NOT NULL,
                visibility TEXT NOT NULL DEFAULT 'private',
                tools_config_json TEXT NOT NULL,
                sections_json TEXT NOT NULL DEFAULT '[]',
                blocked_quizzes_json TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL
            );
            CREATE TABLE topic_snapshots (
                snapshot_key TEXT PRIMARY KEY,
                course_id INTEGER NOT NULL,
                topic_index INTEGER NOT NULL,
                source_id TEXT NOT NULL,
                authority TEXT NOT NULL,
                title TEXT NOT NULL,
                content_text TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_hash TEXT NOT NULL,
                safety_status TEXT NOT NULL,
                visibility TEXT NOT NULL DEFAULT 'private',
                updated_at TEXT NOT NULL
            );
            CREATE TABLE topic_mixes (
                mix_id TEXT PRIMARY KEY,
                course_id INTEGER NOT NULL,
                topic_index INTEGER NOT NULL,
                title TEXT NOT NULL,
                source_hash TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                visibility TEXT NOT NULL DEFAULT 'private',
                has_upstream_update INTEGER NOT NULL DEFAULT 0,
                user_notes TEXT,
                mix_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE exam_mixes (
                course_id INTEGER PRIMARY KEY,
                exam_mix_id TEXT NOT NULL,
                visibility TEXT NOT NULL DEFAULT 'private',
                exam_mix_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO workspace_courses VALUES (
                777, 'ucu', 'Legacy Course', 'LEG-777', 'https://learn.ucu.edu.ua',
                'moodle_extension', 'private', '{}', '[]', '[]', '2026-11-14T18:00:00+00:00'
            );
            """
        )

    store = WorkspaceStore(db_path=str(legacy_db))
    assert store.list_courses(owner_id="ws:fresh_user") == []
    legacy_list = store.list_courses(owner_id="legacy")
    assert len(legacy_list) == 1
    assert legacy_list[0].course_id == 777


def test_preflight_diff_and_partial_module_update(isolated_store, monkeypatch):
    from app.models.mix import compute_content_hash
    from app.services.mix_generator import StructuredPlaceholderMixGenerator

    client = TestClient(app)
    h101 = compute_content_hash("mod101:v1")
    h102_v1 = compute_content_hash("mod102:v1")
    h102_v2 = compute_content_hash("mod102:v2")

    payload_v1 = {
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 2201,
        "course_name": "Systems Engineering",
        "sections": [
            {
                "section_index": 0,
                "title": "Topic 0: Pipelines",
                "modules": [
                    {
                        "module_id": 101,
                        "name": "Lecture 1 - Hashing",
                        "modname": "resource",
                        "text_excerpt": "Deterministic SHA-256 content addressing",
                        "module_hash": h101,
                    },
                    {
                        "module_id": 102,
                        "name": "Lecture 2 - Diffing",
                        "modname": "page",
                        "text_excerpt": "Initial pre-flight diff protocol",
                        "module_hash": h102_v1,
                    },
                ],
            }
        ],
    }
    res1 = client.post("/api/sync/extension", json=payload_v1)
    assert res1.status_code == 200
    assert res1.json()["summary"]["new_topics"] == 1

    # Identical pre-flight probe (~1 KB) -> both unchanged
    diff_same = client.post(
        "/api/sync/diff",
        json={
            "course_id": 2201,
            "modules": [
                {"module_id": 101, "section_index": 0, "module_hash": h101},
                {"module_id": 102, "section_index": 0, "module_hash": h102_v1},
            ],
        },
    )
    assert diff_same.status_code == 200
    assert diff_same.json()["unchanged_module_ids"] == [101, 102]
    assert diff_same.json()["changed_module_ids"] == []

    # Edit only module 102 -> pre-flight identifies only 102 as dirty
    diff_partial = client.post(
        "/api/sync/diff",
        json={
            "course_id": 2201,
            "modules": [
                {"module_id": 101, "section_index": 0, "module_hash": h101},
                {"module_id": 102, "section_index": 0, "module_hash": h102_v2},
            ],
        },
    )
    assert diff_partial.status_code == 200
    assert diff_partial.json()["unchanged_module_ids"] == [101]
    assert diff_partial.json()["changed_module_ids"] == [102]
    assert diff_partial.json()["dirty_section_indices"] == [0]

    # Extension omits heavy text_excerpt for unchanged module 101
    payload_v2 = {
        **payload_v1,
        "sections": [
            {
                "section_index": 0,
                "title": "Topic 0: Pipelines",
                "modules": [
                    {
                        "module_id": 101,
                        "name": "Lecture 1 - Hashing",
                        "modname": "resource",
                        "text_excerpt": None,
                        "module_hash": h101,
                    },
                    {
                        "module_id": 102,
                        "name": "Lecture 2 - Diffing",
                        "modname": "page",
                        "text_excerpt": "Updated incremental chunk merge algorithm",
                        "module_hash": h102_v2,
                    },
                ],
            }
        ],
    }
    res2 = client.post("/api/sync/extension", json=payload_v2)
    assert res2.status_code == 200
    assert res2.json()["summary"]["updated_topics"] == 1

    bundle = client.get("/api/workspace/courses/2201").json()
    mix = bundle["topic_mixes"][0]
    assert mix["has_upstream_update"] is True
    assert mix["dirty_chunk_ids"] == ["mod-102"]
    assert "Deterministic SHA-256" in bundle["sections"][0]["modules"][0]["description"]

    # Spy on generate_book_section during ack-update -> only mod-102 should rebuild!
    rebuilt_titles = []
    orig_gen_book = StructuredPlaceholderMixGenerator.generate_book_section

    async def spy_book(self, *args, **kwargs):
        rebuilt_titles.append(kwargs.get("title") or (args[0] if args else ""))
        return await orig_gen_book(self, *args, **kwargs)

    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "generate_book_section", spy_book)
    ack_res = client.post(f"/api/workspace/mixes/{mix['mix_id']}/ack-update")
    assert ack_res.status_code == 200
    acked = ack_res.json()["mix"]
    assert acked["mix_id"] == mix["mix_id"]
    assert acked["dirty_chunk_ids"] == []
    assert rebuilt_titles == ["Lecture 2 - Diffing"]


def test_shared_artifact_cache_and_exam_shield_non_caching(isolated_store):
    import sqlite3

    client_a = TestClient(app)
    client_b = TestClient(app)

    sess_a = client_a.get("/api/workspace/session").json()
    sess_b = client_b.get("/api/workspace/session").json()
    headers_a = {"X-Workspace-Token": sess_a["workspace_token"]}
    headers_b = {"X-Workspace-Token": sess_b["workspace_token"]}

    course_payload = {
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 3301,
        "course_name": "Shared Cache Algorithms",
        "sections": [
            {
                "section_index": 0,
                "title": "Week 1: Dynamic Programming",
                "modules": [
                    {
                        "module_id": 501,
                        "name": "Lecture Alpha",
                        "modname": "resource",
                        "text_excerpt": "Bellman equations, memoization, DAG longest path",
                    },
                    {
                        "module_id": 502,
                        "name": "Restricted Midterm Exam",
                        "modname": "quiz",
                        "text_excerpt": "SECRET EXAM KEY DO NOT CACHE",
                        "quiz_meta": {"name": "Restricted Midterm Exam", "timelimit_seconds": 3600},
                    },
                ],
            }
        ],
    }

    # Student A computes & populates shared cache (only for safe_material, NEVER restricted_exam)
    res_a = client_a.post("/api/sync/extension", json=course_payload, headers=headers_a)
    assert res_a.status_code == 200
    assert res_a.json()["summary"]["cache_hits"] == 0
    assert res_a.json()["summary"]["recomputed_artifacts"] > 0

    # Student B has NO pre-flight entry (private tenant), so /api/sync/diff reports new module
    diff_b = client_b.post(
        "/api/sync/diff",
        json={"course_id": 3301, "modules": [{"module_id": 501, "section_index": 0, "module_hash": "x"}]},
        headers=headers_b,
    )
    assert diff_b.json()["new_module_ids"] == [501]

    # Student B syncs same content -> hits shared artifact_cache with 0 LLM recompute
    res_b = client_b.post("/api/sync/extension", json=course_payload, headers=headers_b)
    assert res_b.status_code == 200
    sum_b = res_b.json()["summary"]
    assert sum_b["cache_hits"] >= 3
    assert sum_b["recomputed_artifacts"] == 0

    # Verify Student A notes stay private & restricted_exam text NEVER entered artifact_cache
    mix_a = client_a.get("/api/workspace/courses/3301", headers=headers_a).json()["topic_mixes"][0]
    client_a.patch(
        f"/api/workspace/mixes/{mix_a['mix_id']}/notes",
        json={"notes": "Student A top secret note"},
        headers=headers_a,
    )
    client_b.post("/api/workspace/courses/3301/exam-mix", headers=headers_b)

    with sqlite3.connect(str(isolated_store.db_path)) as conn:
        rows = conn.execute("SELECT payload_json FROM artifact_cache").fetchall()
    all_cached_blob = "\n".join(r[0] for r in rows)
    assert "SECRET EXAM KEY DO NOT CACHE" not in all_cached_blob
    assert "Restricted Midterm Exam" not in all_cached_blob
    assert "Student A top secret note" not in all_cached_blob


def test_checkbox_toggle_flashcards_only_no_book_or_quiz_recompute(isolated_store, monkeypatch):
    from app.services.mix_generator import StructuredPlaceholderMixGenerator

    client = TestClient(app)
    initial_tools = (
        '{"interactive_book": true, "mermaid_diagrams": true, '
        '"visual_cards": true, "practice_quizzes": true, '
        '"flashcards": false, "exam_mix": true, "deadline_tracker": true}'
    )
    up_res = client.post(
        "/api/workspace/courses/upload",
        data={"course_title": "Operating Systems", "tools_json": initial_tools},
        files={
            "file": (
                "schedulers.md",
                b"# CPU Scheduling\nShortest Job First minimizes average waiting time.\nRound Robin uses a fixed time quantum.",
                "text/markdown",
            )
        },
    )
    assert up_res.status_code == 200
    cid = up_res.json()["course_id"]

    calls = {"book": 0, "mermaid": 0, "card": 0, "quiz": 0, "flash": 0}
    orig_book = StructuredPlaceholderMixGenerator.generate_book_section
    orig_mmd = StructuredPlaceholderMixGenerator.generate_mermaid_diagram
    orig_card = StructuredPlaceholderMixGenerator.generate_visual_card
    orig_quiz = StructuredPlaceholderMixGenerator.generate_practice_quizzes
    orig_flash = StructuredPlaceholderMixGenerator.generate_flashcards

    async def spy_book(self, *args, **kwargs):
        calls["book"] += 1
        return await orig_book(self, *args, **kwargs)

    async def spy_mmd(self, *args, **kwargs):
        calls["mermaid"] += 1
        return await orig_mmd(self, *args, **kwargs)

    async def spy_card(self, *args, **kwargs):
        calls["card"] += 1
        return await orig_card(self, *args, **kwargs)

    async def spy_quiz(self, *args, **kwargs):
        calls["quiz"] += 1
        return await orig_quiz(self, *args, **kwargs)

    async def spy_flash(self, *args, **kwargs):
        calls["flash"] += 1
        return await orig_flash(self, *args, **kwargs)

    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "generate_book_section", spy_book)
    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "generate_mermaid_diagram", spy_mmd)
    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "generate_visual_card", spy_card)
    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "generate_practice_quizzes", spy_quiz)
    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "generate_flashcards", spy_flash)

    # Turn ONLY flashcards ON
    toggle_res = client.put(
        f"/api/workspace/courses/{cid}/tools",
        json={
            "interactive_book": True,
            "mermaid_diagrams": True,
            "visual_cards": True,
            "practice_quizzes": True,
            "flashcards": True,
            "exam_mix": True,
            "deadline_tracker": True,
        },
    )
    assert toggle_res.status_code == 200
    t_data = toggle_res.json()
    assert t_data["recomputed_artifacts"] == ["flashcards"]
    assert "book_sections" in t_data["reused_artifacts"]
    assert "practice_quizzes" in t_data["reused_artifacts"]
    assert calls == {"book": 0, "mermaid": 0, "card": 0, "quiz": 0, "flash": 1}

    bundle = client.get(f"/api/workspace/courses/{cid}").json()
    assert len(bundle["topic_mixes"][0]["flashcards"]) >= 1


@pytest.mark.asyncio
async def test_debounced_queue_coalesces_four_rapid_uploads(isolated_store, monkeypatch):
    from app.config import get_settings
    from app.models.mix import CourseToolsConfig
    from app.services.build_queue import get_build_queue
    from app.services.workspace_store import get_workspace_store

    monkeypatch.setattr(get_settings(), "BUILD_DEBOUNCE_SECONDS", 0.05)
    store = get_workspace_store()
    queue = get_build_queue()
    owner_id = "ws:debounce_tester"
    tools = CourseToolsConfig(flashcards=False, exam_mix=True)

    # Rapid burst of 4 uploads into the same course
    res1 = await store.create_or_ingest_upload(
        title="Networks 101",
        authority="custom",
        content_text="TCP three-way handshake and congestion control",
        filename="lec1.md",
        tools=tools,
        owner_id=owner_id,
    )
    cid = res1["course_id"]
    for i in range(2, 5):
        await store.create_or_ingest_upload(
            title=f"Lecture {i}",
            authority="custom",
            content_text=f"Topic {i} routing protocol details",
            filename=f"lec{i}.md",
            tools=tools,
            owner_id=owner_id,
            course_id=cid,
        )

    jobs_before = queue.get_jobs(owner_id, cid)
    assert len(jobs_before) == 1
    assert jobs_before[0]["scheduled_count"] == 4
    assert jobs_before[0]["status"] == "debouncing"

    await asyncio.sleep(0.15)
    jobs_after = queue.get_jobs(owner_id, cid)
    assert jobs_after[0]["status"] == "completed"
    assert jobs_after[0]["executions"] == 1

    bundle = store.get_course_bundle(cid, owner_id=owner_id)
    assert bundle is not None
    assert bundle["course"].exam_mix_stale is False
    assert bundle["exam_mix"] is not None
    assert len(bundle["exam_mix"].included_mix_ids) == 4


def test_incremental_exam_mix_reuses_unchanged_topic_digests(isolated_store, monkeypatch):
    from app.services.mix_generator import StructuredPlaceholderMixGenerator

    client = TestClient(app)
    sections = [
        {
            "section_index": i,
            "title": f"Topic {i}",
            "summary": f"Core theorem {i}",
            "modules": [{"module_id": 900 + i, "name": f"Module {i}", "modname": "resource", "text_excerpt": f"Material {i}"}],
        }
        for i in range(4)
    ]
    sync_payload = {
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 4401,
        "course_name": "Distributed Systems",
        "sections": sections,
    }
    assert client.post("/api/sync/extension", json=sync_payload).status_code == 200

    # Initial lazy ExamMix build computes 4 digests
    first_exam = client.post("/api/workspace/courses/4401/exam-mix").json()
    assert first_exam["incremental_updates"] == 4
    assert first_exam["cached_topics_reused"] == 0

    # Add personal note on Topic 0
    bundle_0 = client.get("/api/workspace/courses/4401").json()
    mix0_id = bundle_0["topic_mixes"][0]["mix_id"]
    mix2_id = bundle_0["topic_mixes"][2]["mix_id"]
    client.patch(f"/api/workspace/mixes/{mix0_id}/notes", json={"notes": "Topic 0 Exam Reminder"})

    # Update ONLY Topic 2 out of 4
    updated_sections = list(sections)
    updated_sections[2] = {
        "section_index": 2,
        "title": "Topic 2",
        "summary": "Raft consensus leader election & log replication",
        "modules": [{"module_id": 902, "name": "Module 2", "modname": "resource", "text_excerpt": "Updated Raft quorum proofs"}],
    }
    sync2 = client.post("/api/sync/extension", json={**sync_payload, "sections": updated_sections}).json()
    assert sync2["summary"]["updated_topics"] == 1
    assert sync2["summary"]["unchanged_topics"] == 3
    assert client.post(f"/api/workspace/mixes/{mix2_id}/ack-update").status_code == 200

    digest_calls = []
    orig_digest = StructuredPlaceholderMixGenerator.build_topic_digest

    async def spy_digest(self, mix, include_user_notes=True):
        digest_calls.append(mix.topic_index)
        return await orig_digest(self, mix, include_user_notes=include_user_notes)

    monkeypatch.setattr(StructuredPlaceholderMixGenerator, "build_topic_digest", spy_digest)

    rebuilt = client.post("/api/workspace/courses/4401/exam-mix").json()
    assert digest_calls == [2]
    assert rebuilt["incremental_updates"] == 1
    assert rebuilt["cached_topics_reused"] == 3
    assert "Topic 0 Exam Reminder" in rebuilt["exam_mix"]["master_cheatsheet_markdown"]


def test_extension_attachment_extraction_and_exam_shield_isolation(isolated_store):
    import base64

    client = TestClient(app)
    safe_notes = base64.b64encode(
        b"# Red-Black Trees\nEvery path from root to leaf has equal black height.\nRotations keep O(log n) lookup."
    ).decode("ascii")
    exam_secret = base64.b64encode(b"RESTRICTED FINAL EXAM ANSWERS").decode("ascii")

    res = client.post(
        "/api/sync/extension",
        json={
            "authority": "ucu",
            "moodle_url": "https://learn.ucu.edu.ua",
            "course_id": 5501,
            "course_name": "Advanced Data Structures",
            "sections": [
                {
                    "section_index": 0,
                    "title": "Balanced Trees",
                    "modules": [
                        {
                            "module_id": 701,
                            "name": "Lecture Slides",
                            "modname": "resource",
                            "attachment_filename": "rb_trees.md",
                            "attachment_base64": safe_notes,
                        },
                        {
                            "module_id": 702,
                            "name": "Lab 1 Submission",
                            "modname": "assign",
                            "due_at": "Due: Friday, 20 Nov 23:59",
                            "text_excerpt": "Implement RB insert and delete",
                        },
                        {
                            "module_id": 703,
                            "name": "Final Exam",
                            "modname": "quiz",
                            "attachment_filename": "answers.txt",
                            "attachment_base64": exam_secret,
                            "quiz_meta": {"name": "Final Exam", "timelimit_seconds": 5400},
                        },
                    ],
                }
            ],
        },
    )
    assert res.status_code == 200
    assert res.json()["summary"]["blocked_exams"] == 1

    bundle = client.get("/api/workspace/courses/5501").json()
    book_text = "\n".join(s["explanation_markdown"] for s in bundle["topic_mixes"][0]["book_sections"])
    assert "equal black height" in book_text
    assert "RESTRICTED FINAL EXAM ANSWERS" not in book_text
    assign_mod = [m for m in bundle["sections"][0]["modules"] if m["id"] == 702][0]
    assert assign_mod["due_at"] == "Due: Friday, 20 Nov 23:59"


def test_quiz_attempt_telemetry_feeds_exam_mix_weak_spots_privately(isolated_store):
    client_a = TestClient(app)
    client_b = TestClient(app)
    sess_a = client_a.get("/api/workspace/session").json()
    sess_b = client_b.get("/api/workspace/session").json()
    hdr_a = {"X-Workspace-Token": sess_a["workspace_token"]}
    hdr_b = {"X-Workspace-Token": sess_b["workspace_token"]}

    payload = {
        "authority": "ucu",
        "moodle_url": "https://learn.ucu.edu.ua",
        "course_id": 5601,
        "course_name": "Computer Architecture",
        "sections": [
            {
                "section_index": 0,
                "title": "Pipelining & Hazards",
                "modules": [
                    {
                        "module_id": 801,
                        "name": "Pipeline Hazards",
                        "modname": "page",
                        "text_excerpt": "Data hazards use forwarding\nControl hazards need branch prediction",
                    }
                ],
            }
        ],
    }
    assert client_a.post("/api/sync/extension", json=payload, headers=hdr_a).status_code == 200
    assert client_b.post("/api/sync/extension", json=payload, headers=hdr_b).status_code == 200

    mix_a = client_a.get("/api/workspace/courses/5601", headers=hdr_a).json()["topic_mixes"][0]
    q = mix_a["quizzes"][0]

    # Build initial ExamMix for Student A, then answer wrongly twice -> becomes stale & tracks weak spot
    client_a.post("/api/workspace/courses/5601/exam-mix", headers=hdr_a)
    wrong_idx = (q["correct_index"] + 1) % len(q["options"])
    for _ in range(2):
        att = client_a.post(
            f"/api/workspace/mixes/{mix_a['mix_id']}/quiz-attempt",
            headers=hdr_a,
            json={
                "question": q["question"],
                "chosen_index": wrong_idx,
                "correct_index": q["correct_index"],
                "topic_ref": "Pipelining & Hazards",
            },
        )
        assert att.status_code == 200
        assert att.json()["is_correct"] is False

    bundle_a = client_a.get("/api/workspace/courses/5601", headers=hdr_a).json()
    assert bundle_a["course"]["exam_mix_stale"] is True

    exam_a = client_a.post("/api/workspace/courses/5601/exam-mix", headers=hdr_a).json()["exam_mix"]
    assert any("Weak Spot: Pipelining & Hazards (2 missed)" in w for w in exam_a["weak_spots_focus"])

    # Student B stays completely unaffected by Student A's quiz misses
    exam_b = client_b.post("/api/workspace/courses/5601/exam-mix", headers=hdr_b).json()["exam_mix"]
    assert not any("Weak Spot:" in w for w in exam_b["weak_spots_focus"])


@pytest.mark.asyncio
async def test_workspace_owner_scoped_sse_and_events_history(isolated_store):
    import json
    import httpx

    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as client_a,
        httpx.AsyncClient(transport=transport, base_url="http://test") as client_b,
    ):
        sess_a = (await client_a.get("/api/workspace/session")).json()
        sess_b = (await client_b.get("/api/workspace/session")).json()
        assert sess_a["owner_id"] != sess_b["owner_id"]
        hdr_a = {"X-Workspace-Token": sess_a["workspace_token"]}
        hdr_b = {"X-Workspace-Token": sess_b["workspace_token"]}

        async def _trigger_sync_and_exam():
            await asyncio.sleep(0.05)
            await client_a.post(
                "/api/sync/extension",
                headers=hdr_a,
                json={
                    "authority": "ucu",
                    "moodle_url": "https://learn.ucu.edu.ua",
                    "course_id": 5701,
                    "course_name": "SSE Live Test",
                    "sections": [{"section_index": 0, "title": "Intro", "modules": []}],
                },
            )
            await client_a.post("/api/workspace/courses/5701/exam-mix", headers=hdr_a)

        async def _consume_sse():
            events_seen = []
            async with client_a.stream(
                "GET", "/api/workspace/events/stream?max_events=3", headers=hdr_a
            ) as stream_res:
                assert stream_res.status_code == 200
                async for line in stream_res.aiter_lines():
                    if line.startswith("event: "):
                        events_seen.append(line[len("event: "):].strip())
            return events_seen

        trigger_task = asyncio.create_task(_trigger_sync_and_exam())
        seen_types = await asyncio.wait_for(_consume_sse(), timeout=5.0)
        await trigger_task

        assert "system.connected" in seen_types
        assert "workspace.synced" in seen_types
        assert "mix.ready" in seen_types

        # Student A sees own recent events; Student B sees none of Student A's course events
        hist_a = (await client_a.get("/api/workspace/events", headers=hdr_a)).json()
        hist_b = (await client_b.get("/api/workspace/events", headers=hdr_b)).json()
        assert any(e["type"] == "mix.ready" and e["data"].get("course_id") == 5701 for e in hist_a)
        assert not any(e.get("data", {}).get("course_id") == 5701 for e in hist_b)


@pytest.mark.asyncio
async def test_build_queue_respects_concurrency_limit(isolated_store, monkeypatch):
    from app.config import get_settings
    from app.services.build_queue import get_build_queue

    monkeypatch.setattr(get_settings(), "BUILD_MAX_CONCURRENCY", 2)
    queue = get_build_queue()

    active = 0
    max_active = 0
    completed = 0

    for cid in range(1, 6):
        async def _job():
            nonlocal active, max_active, completed
            active += 1
            max_active = max(max_active, active)
            await asyncio.sleep(0.04)
            active -= 1
            completed += 1

        queue.schedule("ws:conc_tester", cid, "exam_mix", _job, debounce_seconds=0.01)

    await asyncio.sleep(0.25)
    assert completed == 5
    assert max_active <= 2


def test_preview_and_confirm_course_structure(isolated_store):
    client = TestClient(app)

    # 1. Preview course structure from syllabus
    preview_res = client.post(
        "/api/workspace/courses/preview-structure",
        json={
            "course_id": 101,
            "title": "Computer Science & Algorithms",
            "authority": "ucu",
            "target_score": 90,
            "custom_syllabus_text": "## Module 1: Complexity\nBig-O and amortized analysis.\n## Module 2: Trees\nBST and AVL balanced trees.",
        },
    )
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert preview_data["course_id"] == 101
    assert preview_data["target_score"] == 90
    assert len(preview_data["topics"]) >= 2
    top1 = preview_data["topics"][0]
    assert "Complexity" in top1["title"]
    assert top1["difficulty"] == "Basic"

    # 2. Confirm and build the course in database
    confirm_res = client.post(
        "/api/workspace/courses/confirm-structure",
        json={
            "course_id": 101,
            "title": "Computer Science & Algorithms",
            "shortname": "CS101",
            "authority": "ucu",
            "target_score": 90,
            "topics": preview_data["topics"],
            "tools_config": {
                "interactive_book": True,
                "mermaid_diagrams": True,
                "visual_cards": True,
                "practice_quizzes": True,
                "exam_mix": True,
            },
        },
    )
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["success"] is True
    assert confirm_data["course_id"] == 101
    assert confirm_data["topics_count"] == len(preview_data["topics"])

    # 3. Verify it is now returned by /api/workspace/courses
    courses_res = client.get("/api/workspace/courses")
    assert courses_res.status_code == 200
    courses = courses_res.json()
    assert any(c["course_id"] == 101 for c in courses)

    # 4. Verify course bundle loads
    bundle_res = client.get("/api/workspace/courses/101")
    assert bundle_res.status_code == 200
    bundle = bundle_res.json()
    assert len(bundle["topic_mixes"]) == len(preview_data["topics"])

