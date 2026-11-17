from datetime import datetime, timezone
import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from app.models.mix import TopicMaterialItem
from app.services.text_analyzer import MaterialTextAnalyzer, detect_material_type, ADMINISTRATIVE_WORDS

logger = logging.getLogger("course_update_matcher")


def _normalize_tokens(text: str) -> Set[str]:
    """Tokenize and normalize text into clean lowercase words for matching."""
    cleaned = re.sub(r"[^\w\s]", " ", (text or "").lower())
    words = [w.strip() for w in cleaned.split() if len(w.strip()) >= 3]
    return set(words)


def _extract_module_timestamp(mod: Dict[str, Any]) -> int:
    """Extract unix timestamp of latest modification from module or its attached files."""
    ts = 0
    # Check module timemodified
    raw_tm = mod.get("timemodified") or mod.get("timecreated")
    if raw_tm:
        try:
            ts = max(ts, int(raw_tm))
        except (ValueError, TypeError):
            pass

    # Check attached files
    for f in mod.get("files", []) + mod.get("contents", []):
        f_tm = f.get("timemodified")
        if f_tm:
            try:
                ts = max(ts, int(f_tm))
            except (ValueError, TypeError):
                pass

    return ts


class CourseUpdateMatcher:
    """
    Algorithmic matcher that maps Moodle materials to syllabus topics based on:
    1. Logical structure (section name, week/lecture numbers)
    2. Keyword frequency fallback (assigning orphan materials to the topic with maximum keyword overlap)
    3. Timestamp tracking to detect which topic had the latest update and dirty states.
    """

    def __init__(self, topics: List[Dict[str, Any]]):
        self.topics = sorted(topics, key=lambda t: t.get("topic_index", 0))

    def _extract_topic_keywords(self, topic: Dict[str, Any]) -> List[str]:
        """Extract all searchable keywords and concepts for a topic."""
        kws = list(topic.get("keywords") or [])
        concepts = list(topic.get("key_concepts") or [])
        title = topic.get("title", "")
        
        # Add terms from title
        title_terms = [w.strip().lower() for w in re.split(r"[:,\-\(\)/]", title) if len(w.strip()) > 3]

        all_terms = set(kws + concepts + title_terms)
        return [
            t.lower().strip() for t in all_terms
            if len(t.strip()) >= 3 and t.lower().strip() not in ADMINISTRATIVE_WORDS
        ]

    def find_logical_topic_match(
        self,
        mod: Dict[str, Any],
        sec_name: str,
        sec_index: int,
    ) -> Optional[int]:
        """
        Check if material has a direct logical connection to a specific topic
        (e.g. matching week/topic number or strong section name overlap).
        """
        sec_clean = (sec_name or "").lower().strip()
        mod_name = (mod.get("name") or "").lower().strip()

        # Ignore generic sections for logical mapping
        is_generic_sec = sec_clean in ("general", "вступ", "загальне", "інформація", "оголошення", "syllabus", "course info", "")

        # 1. Check if section title contains explicit topic or week number
        sec_week_match = re.search(r"(?:week|тиждень|тема|topic|модуль)\s*(\d+)", sec_clean)
        if sec_week_match:
            week_num = int(sec_week_match.group(1))
            for t in self.topics:
                if t.get("topic_index") == week_num:
                    return week_num

        # 2. Check if module name contains explicit week or topic number
        mod_week_match = re.search(r"(?:week|тиждень|тема|topic|lecture|лекція)\s*(\d+)", mod_name)
        if mod_week_match:
            num = int(mod_week_match.group(1))
            for t in self.topics:
                if t.get("topic_index") == num:
                    return num

        # 3. Check direct title match between section name and topic title
        if not is_generic_sec:
            sec_tokens = _normalize_tokens(sec_clean)
            for t in self.topics:
                t_tokens = _normalize_tokens(t.get("title", ""))
                overlap = sec_tokens.intersection(t_tokens)
                if len(overlap) >= 2 or (len(overlap) >= 1 and len(t_tokens) <= 3):
                    return t.get("topic_index")

        return None

    def score_topic_by_keywords(
        self,
        mod_text: str,
        topic: Dict[str, Any],
    ) -> float:
        """
        Calculate keyword match score between material text and topic keywords.
        Multi-word phrases get higher weight (3x), single words get count-based score.
        """
        keywords = self._extract_topic_keywords(topic)
        if not keywords:
            return 0.0

        mod_lower = mod_text.lower()
        score = 0.0

        for kw in keywords:
            if not kw:
                continue
            if " " in kw:
                # Multi-word phrase exact match has high priority
                if kw in mod_lower:
                    score += 4.0 * mod_lower.count(kw)
            else:
                # Single word match
                pattern = rf"\b{re.escape(kw)}\b"
                matches = len(re.findall(pattern, mod_lower))
                if matches > 0:
                    score += 1.0 * min(matches, 5)

        return score

    def match_material_to_topic(
        self,
        mod: Dict[str, Any],
        sec_name: str,
        sec_index: int,
    ) -> int:
        """
        Assign a single material to the most relevant topic:
        1. Logical match
        2. Maximum keyword overlap
        3. Fallback to Topic 1 or current chronological topic
        """
        # Step 1: Logical match
        logical_idx = self.find_logical_topic_match(mod, sec_name, sec_index)
        if logical_idx is not None:
            return logical_idx

        # Step 2: Keyword scoring fallback
        # Build full searchable text for module
        file_names = [f.get("filename", "") for f in mod.get("files", []) + mod.get("contents", [])]
        search_text = " ".join([
            mod.get("name", ""),
            mod.get("description", "") or "",
            sec_name or "",
            " ".join(file_names),
        ])

        best_score = 0.0
        best_topic_idx = None

        for t in self.topics:
            t_idx = t.get("topic_index", 1)
            score = self.score_topic_by_keywords(search_text, t)
            if score > best_score:
                best_score = score
                best_topic_idx = t_idx

        if best_topic_idx is not None and best_score > 0.0:
            return best_topic_idx

        # Step 3: Default fallback (match by section index if within topic count, else Topic 1)
        if 1 <= sec_index <= len(self.topics):
            return sec_index
        return self.topics[0].get("topic_index", 1) if self.topics else 1

    def match_all_sections(
        self,
        sections: List[Dict[str, Any]],
        existing_module_hashes: Optional[Dict[int, str]] = None,
    ) -> Dict[str, Any]:
        """
        Match all materials from Moodle sections to topics.
        Computes last update timestamps per topic and identifies changed/new materials.
        """
        existing_hashes = existing_module_hashes or {}
        topic_materials: Dict[int, List[Dict[str, Any]]] = {
            t.get("topic_index", 1): [] for t in self.topics
        }
        topic_material_items: Dict[int, List[TopicMaterialItem]] = {
            t.get("topic_index", 1): [] for t in self.topics
        }
        topic_timestamps: Dict[int, int] = {
            t.get("topic_index", 1): 0 for t in self.topics
        }
        dirty_topics: Set[int] = set()
        new_materials_count = 0
        total_materials_count = 0

        for sec_idx, sec in enumerate(sections, start=1):
            sec_name = sec.get("name", f"Section {sec_idx}")
            for mod in sec.get("modules", []):
                mod_id = mod.get("id", 0)
                total_materials_count += 1
                assigned_idx = self.match_material_to_topic(mod, sec_name, sec_idx)

                # Ensure assigned_idx is recognized
                if assigned_idx not in topic_materials:
                    assigned_idx = self.topics[0].get("topic_index", 1) if self.topics else 1

                # Extract rich metadata, detect material type, and analyze key items
                mod_name = mod.get("name", f"Resource {mod_id}")
                mod_desc = mod.get("description") or ""
                mod_url = mod.get("url")
                mod_mime = mod.get("mimetype")
                mod_files = mod.get("files") or mod.get("contents") or []

                mat_type = detect_material_type(
                    name=mod_name,
                    modname=mod.get("modname", "resource"),
                    url=mod_url,
                    mimetype=mod_mime,
                    files=mod_files,
                    description=mod_desc,
                )

                # Combine text content for analysis
                file_texts = [f.get("filename", "") for f in mod_files if f.get("filename")]
                content_for_analysis = f"{mod_name}\n\n{mod_desc}\n\n{' '.join(file_texts)}"

                key_items = MaterialTextAnalyzer.extract_key_items(
                    text=content_for_analysis,
                    title=mod_name,
                    material_type=mat_type,
                    max_items=4,
                )

                mod_ts = _extract_module_timestamp(mod)
                mod_iso_ts = datetime.fromtimestamp(mod_ts, tz=timezone.utc).isoformat() if mod_ts > 0 else None

                mat_item = TopicMaterialItem(
                    id=int(mod_id),
                    name=mod_name,
                    material_type=mat_type,
                    modname=mod.get("modname", "resource"),
                    url=mod_url,
                    download_url=mod.get("download_url"),
                    description=mod_desc,
                    timemodified=mod_ts if mod_ts > 0 else None,
                    last_updated_at=mod_iso_ts,
                    safety_status=mod.get("safety_status", "safe_material"),
                    key_items=key_items,
                    files_count=len(mod_files),
                )

                topic_material_items[assigned_idx].append(mat_item)

                mod_enriched = dict(mod)
                mod_enriched["material_type"] = mat_type
                mod_enriched["key_items"] = key_items
                mod_enriched["last_updated_at"] = mod_iso_ts
                topic_materials[assigned_idx].append(mod_enriched)

                # Check timestamp
                if mod_ts > topic_timestamps[assigned_idx]:
                    topic_timestamps[assigned_idx] = mod_ts

                # Check hash for update detection
                mod_hash = mod.get("module_hash") or f"{mod_id}:{mod.get('name')}:{mod.get('url')}"
                if mod_id not in existing_hashes or existing_hashes[mod_id] != mod_hash:
                    dirty_topics.add(assigned_idx)
                    new_materials_count += 1

        # Format timestamps into ISO format
        topic_iso_timestamps: Dict[int, Optional[str]] = {}
        for t_idx, ts in topic_timestamps.items():
            if ts > 0:
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                topic_iso_timestamps[t_idx] = dt.isoformat()
            else:
                topic_iso_timestamps[t_idx] = None

        return {
            "has_updates": len(dirty_topics) > 0,
            "dirty_topics": sorted(list(dirty_topics)),
            "new_materials_count": new_materials_count,
            "total_materials_count": total_materials_count,
            "topic_materials": topic_materials,
            "topic_material_items": topic_material_items,
            "topic_timestamps": topic_iso_timestamps,
        }
