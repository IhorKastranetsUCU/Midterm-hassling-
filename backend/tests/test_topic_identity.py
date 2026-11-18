"""Regression coverage for historical TopicMix versions shown as duplicate topics."""
import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest

from app.config import get_settings
from app.models.mix import CourseToolsConfig, ExtensionSyncPayload, TopicMix
from app.services.workspace_store import WorkspaceStore


@pytest.fixture
def store(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), "GEMINI_API_KEY", "")
    monkeypatch.setattr(get_settings(), "MOODLE_MOCK_MODE", False)
    return WorkspaceStore(str(tmp_path / "topics.db"))


def course(store, owner="student", course_id=9400):
    store._upsert_course(
        owner_id=owner, course_id=course_id, authority="ucu", title="Probability",
        shortname="PROB", moodle_url="https://learn.ucu.edu.ua",
        source_type="moodle_extension", tools=CourseToolsConfig(),
        sections=[], blocked_quizzes=[],
    )


def mix(mix_id, index=0, version=1, notes=None, course_id=9400, updated=False):
    return TopicMix(
        mix_id=mix_id, course_id=course_id, topic_index=index, title="Lecture",
        source_hash=mix_id, version=version, user_notes=notes,
        has_upstream_update=updated,
    )


def legacy_row(store, topic, owner="student"):
    """Seed the pre-fix storage shape without going through the repaired writer."""
    with store._connect() as conn:
        conn.execute(
            "INSERT INTO topic_mixes (mix_id, owner_id, course_id, topic_index, title, "
            "source_hash, version, visibility, has_upstream_update, user_notes, mix_json, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (topic.mix_id, owner, topic.course_id, topic.topic_index, topic.title,
             topic.source_hash, topic.version, topic.visibility,
             int(topic.has_upstream_update), topic.user_notes, topic.model_dump_json(),
             topic.updated_at.isoformat()),
        )


def rows(store):
    with store._connect() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM topic_mixes ORDER BY mix_id")]


def test_legacy_versions_are_one_topic_but_equal_titles_remain_distinct(store):
    course(store)
    legacy_row(store, mix("old", version=2, updated=True))
    legacy_row(store, mix("current", version=9))
    legacy_row(store, mix("different-topic", index=1, updated=True))
    before = rows(store)

    bundle = store.get_course_bundle(9400, "student")
    assert [m.mix_id for m in bundle["topic_mixes"]] == ["current", "different-topic"]
    assert bundle["course"].topic_count == 2
    assert bundle["course"].updates_pending == 1
    summary = store.list_courses("student")[0]
    assert (summary.topic_count, summary.updates_pending) == (2, 1)
    assert rows(store) == before, "Reading must not delete or rewrite historical versions"


def test_new_hash_reuses_topic_identity_and_keeps_notes_and_history(store):
    course(store)
    legacy_row(store, mix("archived", version=1, notes="Historical note"))
    legacy_row(store, mix("current", version=3, notes="My current note"))
    archived = rows(store)[0]
    generated = mix("new-content-hash")
    store._save_topic_mix(generated, "student")

    assert generated.mix_id == "current"
    assert generated.version == 4
    assert generated.user_notes == "My current note"
    assert len(rows(store)) == 2
    assert rows(store)[0] == archived
    persisted = json.loads(next(r for r in rows(store) if r["mix_id"] == "current")["mix_json"])
    assert (persisted["mix_id"], persisted["user_notes"]) == ("current", "My current note")
    assert store.get_course_bundle(9400, "student")["topic_mixes"][0].source_hash == "new-content-hash"


def test_topic_identity_is_scoped_to_owner_course_and_index(store):
    for owner, cid in [("student", 9400), ("other", 9400), ("student", 9401)]:
        course(store, owner, cid)
        for index in (0, 1):
            store._save_topic_mix(mix(f"{cid}-initial-{index}", index=index, course_id=cid), owner)
    # The other course needs globally distinct mix IDs within one owner's namespace.
    # Real generators include course_id in their generated IDs.
    assert len(store.get_course_bundle(9400, "other")["topic_mixes"]) == 2
    assert store.get_course_bundle(9400, "student")["topic_mixes"][0].course_id == 9400
    assert len(rows(store)) == 6


def test_legacy_note_link_targets_current_topic_without_changing_archived_row(store):
    course(store)
    legacy_row(store, mix("old", notes="Original note"))
    legacy_row(store, mix("current", version=2))
    assert store.get_course_bundle(9400, "student")["topic_mixes"][0].user_notes == "Original note"
    updated = store.save_mix_notes("old", "Edited note", "student")
    assert updated.mix_id == "current"
    assert store.get_course_bundle(9400, "student")["topic_mixes"][0].user_notes == "Edited note"
    assert next(r for r in rows(store) if r["mix_id"] == "old")["user_notes"] == "Original note"
    store.save_mix_notes("current", "", "student")
    assert store.get_course_bundle(9400, "student")["topic_mixes"][0].user_notes == ""
    assert store.save_mix_notes("old", "Private", "other") is None


def test_concurrent_generation_of_same_topic_saves_one_identity(store):
    course(store)
    barrier = Barrier(2)

    def save(candidate):
        barrier.wait()
        store._save_topic_mix(candidate, "student")
        return candidate.mix_id

    with ThreadPoolExecutor(max_workers=2) as pool:
        ids = list(pool.map(save, [mix("first"), mix("second")]))
    assert len(set(ids)) == 1
    assert len(rows(store)) == 1


def test_resync_and_full_regeneration_keep_topic_ids_and_notes(store):
    payload = ExtensionSyncPayload.model_validate({
        "course_id": 9400, "course_name": "Probability", "moodle_url": "https://learn.ucu.edu.ua",
        "sections": [{"section_index": 0, "title": "Lecture", "summary": "Probability axioms"},
                     {"section_index": 1, "title": "Lecture", "summary": "Conditional probability"}],
    })
    asyncio.run(store.sync_extension_payload(payload, "student"))
    original = store.get_course_bundle(9400, "student")["topic_mixes"]
    original_ids = [m.mix_id for m in original]
    store.save_mix_notes(original_ids[0], "Keep my note", "student")
    for n in range(2):
        payload.sections[0].summary = f"Probability axioms and example {n}"
        asyncio.run(store.sync_extension_payload(payload, "student"))
        asyncio.run(store.regenerate_course_mixes(9400, "student", force_full=True))
    final = store.get_course_bundle(9400, "student")["topic_mixes"]
    assert [m.mix_id for m in final] == original_ids
    assert final[0].user_notes == "Keep my note"
    assert len(rows(store)) == 2
