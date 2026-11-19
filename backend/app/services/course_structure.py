"""A lossless navigation view over Moodle sources. It never rewrites study history.

Section numbers are navigation identities, NOT educational topic numbers. Parent
relationships come from Moodle; old snapshots only get unambiguous title matches.
"""
import html
import re
from urllib.parse import urlsplit


MODULE_NAMES = {
    "вкладена секція": "subsection", "файл": "resource", "тека": "folder",
    "лекція": "lesson", "тест": "quiz", "завдання": "assign", "сторінка": "page",
    "книга": "book", "форум": "forum", "область тексту та медіа": "label",
    "url (веб-посилання)": "url", "посилання": "url",
}


def clean_text(value):
    text = str(value or "")
    for _ in range(2):
        text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def canonical_module(module):
    """Moodle state.modname is translated; state.module is the machine name."""
    candidate = module.get("module") or str(module.get("plugin") or "").removeprefix("mod_")
    if isinstance(candidate, str) and re.fullmatch(r"[a-z][a-z0-9_]*", candidate):
        return candidate
    path = urlsplit(module.get("url") or "").path
    match = re.search(r"/mod/([a-z][a-z0-9_]*)/", path)
    return match.group(1) if match else MODULE_NAMES.get(str(module.get("modname") or "").lower(), module.get("modname") or "resource")


def normalize_sections(sections):
    result = []
    for i, section in enumerate(sections or []):
        modules = []
        for raw in section.get("modules", []):
            kind = canonical_module(raw)
            item = {**raw, "id": raw.get("id", raw.get("module_id", 0)),
                    "name": clean_text(raw.get("name")), "modname": kind}
            # Do not invent URLs for text headings or nested-section placeholders.
            if kind in {"label", "subsection"} and "/mod/" in str(item.get("url") or ""):
                item["url"] = None
            modules.append(item)
        result.append({**section, "id": section.get("id", section.get("section_index", i)),
                       "name": clean_text(section.get("name") or section.get("title")), "modules": modules})
    return result


def topic_number(title):
    match = re.search(r"\b(?:topic|week|тема|тиждень|module|модуль|lecture|лекція)\s*(\d+)\b", clean_text(title).lower())
    return int(match.group(1)) if match else None


def section_kind(title):
    name = clean_text(title).lower()
    if re.search(r"^(general|загальне|вступ|інформація)$|syllabus|силабус|оголошення|course info", name):
        return "info"
    if re.search(r"recordings.?20\d\d|архів", name):
        return "archive"
    if re.search(r"^(part|частина|розділ|module|модуль)\s+[\divxlc]+", name):
        return "chapter"
    if re.search(r"colloquium|midterm|exam|іспит|колоквіум|контрольн|homework|домашн|research project", name):
        return "assessment"
    if re.search(r"helpful|additional|consultation|додатков|консультац|bonus", name):
        return "resources"
    return "topic"


def _model(value):
    return value.model_dump(mode="json") if hasattr(value, "model_dump") else value


def build_course_map(bundle):
    sections = normalize_sections(bundle.get("sections", []))
    mixes = [_model(m) for m in bundle.get("topic_mixes", [])]
    if not sections or (_model(bundle.get("course")) or {}).get("source_type") == "manual_upload":
        # Upload-only courses use their existing TopicMix reader, not an empty Moodle map.
        return None
    nodes = []
    by_section = {}
    by_moodle = {}
    for order, sec in enumerate(sections):
        stable_id = f"moodle-section-{sec['moodle_section_id']}" if sec.get("moodle_section_id") is not None else f"section-{sec['id']}"
        node = {"id": stable_id, "section_index": sec["id"],
                "title": sec["name"], "summary": clean_text(sec.get("summary")), "summary_markdown": sec.get("summary") or "",
                "kind": section_kind(sec["name"]), "parent_id": None,
                "position": order, "materials": [], "children": [],
                "source_url": sec.get("url"), "relationship": "source"}
        nodes.append(node)
        by_section[sec["id"]] = node
        if sec.get("moodle_section_id") is not None:
            by_moodle[str(sec["moodle_section_id"])] = node

    # Explicit Moodle parent IDs always win. Do not guess repeated 'Lecture'/'Lab'.
    for sec, node in zip(sections, nodes):
        parent = by_moodle.get(str(sec.get("parent_section_id")))
        if parent is None and sec.get("parent_section_index") is not None:
            parent = by_section.get(sec["parent_section_index"])
        if parent and parent is not node:
            node["parent_id"] = parent["id"]

    for sec, parent in zip(sections, nodes[:]):
        for order, mod in enumerate(sec["modules"]):
            if mod["modname"] != "subsection":
                continue
            child = by_moodle.get(str(mod.get("delegatesectionid")))
            if child is None:
                candidates = [n for n in nodes if n is not parent and n["title"].casefold() == mod["name"].casefold() and n["parent_id"] in (None, parent["id"])]
                # A globally unique title can repair legacy snapshots, without reordering others.
                refs = sum(m["modname"] == "subsection" and m["name"].casefold() == mod["name"].casefold() for s in sections for m in s["modules"])
                child = candidates[0] if len(candidates) == 1 and refs == 1 else None
                if child:
                    child["relationship"] = "unique_title"
            if child and child is not parent:
                child["parent_id"] = parent["id"]
                child["position"] = order

    # Legacy courses also use text-and-media headings instead of real subsections.
    # Preserve their source order; split only explicit Topic/Тема headings.
    for sec, node in zip(sections, nodes[:]):
        target = node
        for order, mod in enumerate(sec["modules"]):
            if mod["modname"] == "subsection":
                continue
            heading = re.match(r"^((?:topic|тема)\s*\d+\s*[:.\-–]?\s*.+?)(?:\s*\.{3}|$)", mod["name"], re.I)
            if node["kind"] == "chapter" and mod["modname"] == "label" and heading:
                target = {"id": f"{node['id']}-module-{mod['id']}", "section_index": sec["id"],
                          "title": heading.group(1).strip(), "summary": clean_text(mod.get("description")), "summary_markdown": mod.get("description") or "",
                          "kind": "topic", "parent_id": node["id"], "position": order,
                          "materials": [], "children": [], "source_url": node["source_url"],
                          "relationship": "source_heading"}
                nodes.append(target)
            target["materials"].append(mod)

    by_id = {n["id"]: n for n in nodes}
    # Bad upstream data must not create a recursive navigation tree.
    for node in nodes:
        visited = {node["id"]}
        ancestor = node.get("parent_id")
        while ancestor in by_id:
            if ancestor in visited:
                node["parent_id"] = None
                break
            visited.add(ancestor)
            ancestor = by_id[ancestor].get("parent_id")
        if node["parent_id"] in by_id:
            by_id[node["parent_id"]]["children"].append(node["id"])
    for node in nodes:
        node["children"].sort(key=lambda key: by_id[key]["position"])
        if not node["summary_markdown"]:
            node["summary_markdown"] = next((m.get("description") for m in node["materials"] if m["modname"] == "label" and m.get("description")), "")
        intro = node["summary_markdown"].strip()
        if intro.startswith("#"):
            first, _, rest = intro.partition("\n")
            if topic_number(first) is not None and topic_number(first) == topic_number(node["title"]):
                node["summary_markdown"] = rest.strip()
        own_mix = next((m for m in mixes if m["topic_index"] == node["section_index"] and clean_text(m["title"]).casefold() == node["title"].casefold()), None)
        if own_mix is None:
            matches = [m for m in mixes if clean_text(m["title"]).casefold() == node["title"].casefold()]
            own_mix = matches[0] if len(matches) == 1 else None
        node["topic_index"] = own_mix["topic_index"] if own_mix else None
        node["mix_id"] = own_mix["mix_id"] if own_mix else None
        ids = {str(m["id"]) for m in node["materials"] if m["modname"] not in {"label", "subsection", "quiz"}}
        allowed_headings = {m["name"].casefold() for m in node["materials"] if m["modname"] != "quiz"}
        blocks = []
        for mix in mixes:
            for block in mix.get("book_sections", []):
                chunk = str(block.get("chunk_id") or "")
                belongs = chunk.removeprefix("mod-") in ids if chunk.startswith("mod-") else mix is own_mix and clean_text(block["heading"]).casefold() in allowed_headings | {node["title"].casefold()}
                if not belongs:
                    continue
                text = block.get("explanation_markdown", "")
                # Placeholder summaries are indexes, not lecture explanations.
                if "This interactive unit organizes material from **" in text:
                    continue
                blocks.append(block)
        node["book_sections"] = blocks
        node["quizzes"] = [
            q for q in (own_mix or {}).get("quizzes", [])
            if is_study_question(q.get("question", ""), q.get("explanation", ""))
        ]
        node["flashcards"] = [f for f in (own_mix or {}).get("flashcards", []) if not re.search(r"Key Concept #|Core concepts covered", f.get("front", "") + f.get("back", ""))]
        node["material_count"] = sum(m["modname"] not in {"label", "subsection"} for m in node["materials"])
        node["learnable"] = node["kind"] == "topic" and bool(node["material_count"] or blocks)
    return {"version": 1, "nodes": nodes, "roots": [n["id"] for n in nodes if n["parent_id"] is None]}


def is_study_question(question: str, explanation: str) -> bool:
    return bool(question.strip() and not re.search(
        r"Which key concept is explicitly introduced|How many core study items were indexed|"
        r"AI Engineer will enrich|Which mode builds the cross-topic prep sheet",
        f"{question} {explanation}", re.IGNORECASE,
    ))
