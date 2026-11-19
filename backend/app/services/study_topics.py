"""Course sections and source excerpts shared by the study tools."""

from dataclasses import dataclass

from fastapi import HTTPException

from app.services.course_structure import build_course_map, section_kind
from app.services.mix_generator import clean_source_for_ai


EXCLUDED_SECTIONS = {"info", "resources", "archive", "assessment"}


@dataclass(frozen=True)
class StudySource:
    title: str
    text: str


def study_course(store, owner_id, course_id):
    bundle = store.get_course_bundle(course_id, owner_id)
    if bundle is None:
        raise HTTPException(404, "Курс не знайдено.")
    return bundle


def study_topics(bundle):
    mixes = {mix.topic_index: mix for mix in bundle["topic_mixes"]}
    course_map = build_course_map(bundle) or {"nodes": [], "roots": []}
    nodes = {node["id"]: node for node in course_map["nodes"]}
    topics = {}
    mapped = set()

    def walk(node_id, path=(), excluded=False):
        node = nodes[node_id]
        excluded = excluded or node["kind"] in EXCLUDED_SECTIONS
        index = node["topic_index"]
        if index in mixes:
            mapped.add(index)
            if not excluded and index not in topics:
                topics[index] = {
                    "title": node["title"], "path": list(path), "node_id": node_id,
                    "mix_id": mixes[index].mix_id,
                }
        for child in node["children"]:
            walk(child, (*path, node["title"]), excluded)

    for root in course_map["roots"]:
        walk(root)
    for index, mix in mixes.items():
        if index not in mapped and section_kind(mix.title) not in EXCLUDED_SECTIONS:
            topics[index] = {"title": mix.title, "path": [], "node_id": None, "mix_id": mix.mix_id}
    return topics


def topic_sources(conn, owner_id, course_id, topic_index):
    params = (owner_id, course_id, topic_index)
    snapshot = conn.execute(
        "SELECT title, content_text, safety_status FROM topic_snapshots "
        "WHERE owner_id=? AND course_id=? AND topic_index=?", params,
    ).fetchone()
    if not snapshot or snapshot["safety_status"] == "restricted_exam":
        return []
    chunks = conn.execute(
        "SELECT heading, content_text, safety_status, modname FROM module_chunks "
        "WHERE owner_id=? AND course_id=? AND topic_index=? ORDER BY order_index, chunk_id", params,
    ).fetchall()
    excerpts = [(row["heading"], row["content_text"]) for row in chunks
                if row["safety_status"] != "restricted_exam" and row["modname"] not in {"quiz", "assign", "forum", "subsection"}]
    if not chunks:
        excerpts = [(snapshot["title"], snapshot["content_text"])]

    sources = []
    remaining = 18_000
    seen = set()
    for title, content in excerpts:
        size = min(remaining, 3_000) if len(excerpts) > 1 else remaining
        text = clean_source_for_ai(content)[:size]
        if len(text) < 25 or text in seen:
            continue
        seen.add(text)
        sources.append(StudySource(title.strip()[:200], text))
        remaining -= len(text)
        if remaining < 25:
            break
    return sources
