"""Non-destructive, owner-scoped organization of a course's source materials.

Organization is a view over existing content, not a replacement for lecture text,
TopicMix IDs, personal notes, or quiz history. Each confirmation keeps a revision.
"""
import json
from datetime import datetime, timezone

from app.models.mix import QuizSafetyMetadata
from app.services.course_update_matcher import CourseUpdateMatcher
from app.services.course_structure import normalize_sections


def safe_sections(sections):
    result = []
    for index, section in enumerate(normalize_sections(sections)):
        modules = []
        for module in section.get("modules", []):
            item = dict(module)
            safety = item.get("safety_status")
            if item.get("modname") == "quiz" and not safety:
                safety = QuizSafetyMetadata.model_validate(
                    item.get("quiz_meta") or {"name": item.get("name", "Quiz")}
                ).classify_safety()
            if safety == "restricted_exam":
                continue
            item["id"] = item.get("id", item.get("module_id", 0))
            item["description"] = item.get("description") or item.get("text_excerpt") or ""
            item["safety_status"] = safety or "safe_material"
            modules.append(item)
        result.append({**section, "id": section.get("id", index),
                       "name": section.get("name") or section.get("title") or f"Тема {index + 1}",
                       "modules": modules})
    return result


def _ensure_table(conn):
    conn.execute("""CREATE TABLE IF NOT EXISTS course_organization_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id TEXT NOT NULL, course_id INTEGER NOT NULL,
        structure_json TEXT NOT NULL, created_at TEXT NOT NULL
    )""")


def save_organization(store, owner_id, course_id, topics, target_score=85):
    payload = {"topics": [t.model_dump() if hasattr(t, "model_dump") else t for t in topics],
               "target_score": target_score}
    with store._connect() as conn:
        _ensure_table(conn)
        conn.execute("INSERT INTO course_organization_versions (owner_id, course_id, structure_json, created_at) VALUES (?, ?, ?, ?)",
                     (owner_id, course_id, json.dumps(payload, ensure_ascii=False), datetime.now(timezone.utc).isoformat()))
    return payload


def get_organization(store, owner_id, course_id):
    with store._connect() as conn:
        _ensure_table(conn)
        row = conn.execute("SELECT structure_json FROM course_organization_versions WHERE owner_id = ? AND course_id = ? ORDER BY id DESC LIMIT 1", (owner_id, course_id)).fetchone()
    return json.loads(row[0]) if row else None


def material_groups(bundle, organization=None):
    sections = safe_sections(bundle["sections"])
    topics = (organization or {}).get("topics", [])
    # The matcher enriches metadata without fetching videos or calling a model.
    definitions = topics or [{"topic_index": i, "title": s["name"]} for i, s in enumerate(sections)]
    if not definitions:
        return []
    groups = {t["topic_index"]: {"topic_index": t["topic_index"], "title": t["title"],
                               "summary": t.get("summary", ""), "materials": []} for t in definitions}
    matcher = CourseUpdateMatcher(definitions)
    enriched = matcher.match_all_sections(sections).get("topic_material_items", {})
    metadata = {m.id: m.model_dump(mode="json") for values in enriched.values() for m in values}
    # Prefer the already ingested rich metadata (including transcripts and links).
    for mix in bundle["topic_mixes"]:
        for material in mix.materials:
            if material.safety_status != "restricted_exam":
                metadata[material.id] = {**metadata.get(material.id, {}), **material.model_dump(mode="json")}
    explicit = {mid: t["topic_index"] for t in topics for mid in t.get("material_ids", [])}
    seen = set()
    for idx, section in enumerate(sections):
        for mod in section["modules"]:
            key = mod["id"] or mod.get("url") or (idx, mod.get("name"))
            if key in seen:
                continue
            seen.add(key)
            target = explicit.get(mod["id"])
            if target not in groups:
                if not topics:
                    target = idx
                elif any(label in section["name"].lower() for label in ("general", "course info", "syllabus", "силабус", "загальн", "організаці", "оголошення")):
                    target = -1
                    groups.setdefault(target, {"topic_index": target, "title": "Про курс", "summary": "", "materials": []})
                else:
                    target = matcher.find_logical_topic_match(mod, section["name"], idx + 1)
                    if target is None:
                        text = f'{mod.get("name", "")} {mod.get("description", "")} {section["name"]}'
                        scores = [(matcher.score_topic_by_keywords(text, t), t["topic_index"]) for t in topics]
                        score, target = max(scores)
                        if score <= 0:
                            target = -2
                            groups.setdefault(target, {"topic_index": target, "title": "Інші матеріали", "summary": "", "materials": []})
            if target not in groups:
                target = next(iter(groups))
            item = {**metadata.get(mod["id"], {}), "id": mod["id"], "name": mod.get("name", "Матеріал"),
                    "modname": mod.get("modname", "resource"), "safety_status": mod["safety_status"],
                    "source_section": section["name"], "url": mod.get("url") or metadata.get(mod["id"], {}).get("url"),
                    "description": mod.get("description", ""), "source_type": section.get("source_type", "moodle")}
            groups[target]["materials"].append(item)
    return list(groups.values())
