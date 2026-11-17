import logging
import math
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from app.models.mix import TopicMaterialItem
from app.services.text_analyzer import (
    ADMINISTRATIVE_WORDS,
    CurriculumConceptParser,
    MaterialTextAnalyzer,
    clean_html_and_formatting,
    detect_material_type,
)
from app.services.video_transcriber import VideoTranscriberService

logger = logging.getLogger("content_clusterer")


class MaterialContentClusterer:
    """
    Intelligent curriculum & material clustering engine:
    1. Extracts strictly the canonical academic topics defined in the syllabus
       (eliminating administrative containers like Colloquium, Midterm, Lab, Seminars).
    2. Clusters all scattered course materials (lectures, seminars, readings, videos,
       audio, self-tests, quizzes) into their rightful syllabus topic based on deep
       content analysis, zero-token video transcription, and keyword relevance.
    """

    @classmethod
    def extract_canonical_syllabus_topics(
        cls,
        sections: Optional[List[Dict[str, Any]]] = None,
        custom_syllabus_text: Optional[str] = None,
        target_score: int = 85,
    ) -> List[Dict[str, Any]]:
        """
        Produce strictly the canonical academic topics defined in the syllabus.
        Ensures the topic count matches the actual syllabus curriculum, NOT the
        number of Moodle sections.
        """
        # 1. If explicit syllabus text or syllabus dump is provided, parse directly
        if custom_syllabus_text and custom_syllabus_text.strip():
            parsed_topics = CurriculumConceptParser.parse_curriculum_text(
                custom_syllabus_text, target_score=target_score
            )
            if parsed_topics:
                logger.info(f"Extracted {len(parsed_topics)} canonical syllabus topics from text dump.")
                return parsed_topics

        # 2. Extract from Moodle sections by grouping by topic index and filtering administrative sections
        if not sections:
            return []

        # Find syllabus text embedded in Section 0 / General if present
        for s in sections:
            s_name = (s.get("name") or "").lower()
            if any(k in s_name for k in ("general", "вступ", "силабус", "syllabus", "інформація")):
                desc = s.get("summary") or ""
                if len(desc) > 80 and ("тема" in desc.lower() or "topic" in desc.lower() or "тиждень" in desc.lower()):
                    parsed = CurriculumConceptParser.parse_curriculum_text(desc, target_score=target_score)
                    if parsed:
                        logger.info(f"Extracted {len(parsed)} canonical syllabus topics from General section summary.")
                        return parsed

        # Bucket sections by canonical academic topic number
        topic_buckets: Dict[int, Dict[str, Any]] = {}
        unindexed_concept_sections: List[Dict[str, Any]] = []

        for s in sections:
            s_name = (s.get("name") or "").strip()
            # Check if section name is purely administrative container without topic index
            is_admin = CurriculumConceptParser.is_administrative_label(s_name)

            # Extract topic/week number from section name or its modules
            num_match = re.search(
                r"\b(?:topic|тема|week|тиждень|lecture|лекція|module|модуль|chapter|розділ)\s*(\d+)",
                s_name,
                flags=re.IGNORECASE,
            )

            # If no number in section name, check modules
            if not num_match:
                for m in s.get("modules", []):
                    m_name = m.get("name") or ""
                    m_match = re.search(
                        r"\b(?:topic|тема|week|тиждень|lecture|лекція|module|модуль|chapter|розділ)\s*(\d+)",
                        m_name,
                        flags=re.IGNORECASE,
                    )
                    if m_match:
                        num_match = m_match
                        break

            if num_match:
                t_idx = int(num_match.group(1))
                if t_idx not in topic_buckets:
                    topic_buckets[t_idx] = {
                        "topic_index": t_idx,
                        "sections": [],
                        "concept_candidates": [],
                    }
                topic_buckets[t_idx]["sections"].append(s)

                # Search for substantive concept in this section
                concept = CurriculumConceptParser.extract_concept_from_section(s, t_idx)
                if concept and not CurriculumConceptParser.is_administrative_label(concept):
                    topic_buckets[t_idx]["concept_candidates"].append(concept)
            else:
                # Section has no topic number
                if not is_admin and (s.get("modules") or s.get("summary")):
                    clean_name = CurriculumConceptParser.clean_concept_name(s_name)
                    if clean_name and not CurriculumConceptParser.is_administrative_label(clean_name):
                        unindexed_concept_sections.append(s)

        # Build canonical topics from numbered buckets
        canonical_topics: List[Dict[str, Any]] = []
        sorted_indices = sorted(topic_buckets.keys())

        for idx in sorted_indices:
            bucket = topic_buckets[idx]
            candidates = bucket["concept_candidates"]
            # Pick the best concept: prefer one found in lecture or reading modules
            chosen_concept = None
            for c in candidates:
                if len(c) >= 4 and not CurriculumConceptParser.is_administrative_label(c):
                    chosen_concept = c
                    break

            if not chosen_concept:
                # If no direct concept found, check all modules across all sections in this bucket
                for s in bucket["sections"]:
                    for m in s.get("modules", []):
                        m_name = m.get("name") or ""
                        clean_m = CurriculumConceptParser.clean_concept_name(m_name)
                        if clean_m and not CurriculumConceptParser.is_administrative_label(clean_m):
                            chosen_concept = clean_m
                            break
                    if chosen_concept:
                        break

            # If no substantive academic concept was found anywhere in this bucket,
            # this was purely an administrative container (e.g. Test, Exam, Lab), NOT a syllabus topic!
            if not chosen_concept:
                continue

            meta = CurriculumConceptParser.expand_concept_metadata(
                chosen_concept, topic_index=idx, target_score=target_score
            )
            canonical_topics.append(meta)

        # If there were non-administrative unindexed sections and few or no numbered buckets
        if not canonical_topics:
            curr_idx = 1
            for s in unindexed_concept_sections:
                sec_concept = CurriculumConceptParser.extract_concept_from_section(s, curr_idx)
                if sec_concept and not CurriculumConceptParser.is_administrative_label(sec_concept):
                    meta = CurriculumConceptParser.expand_concept_metadata(
                        sec_concept, topic_index=curr_idx, target_score=target_score
                    )
                    canonical_topics.append(meta)
                    curr_idx += 1

        logger.info(f"Canonical syllabus topic extraction complete: {len(canonical_topics)} topics found.")
        return canonical_topics

    @classmethod
    def cluster_all_materials(
        cls,
        sections: List[Dict[str, Any]],
        canonical_topics: List[Dict[str, Any]],
    ) -> Dict[int, List[TopicMaterialItem]]:
        """
        Collect all materials across ALL Moodle sections and cluster each material
        into its rightful canonical syllabus topic.
        """
        if not canonical_topics:
            return {}

        # Prepare topic lookup and topic keyword vectors
        topic_map: Dict[int, Dict[str, Any]] = {}
        for t in canonical_topics:
            t_idx = t.get("topic_index", 1)
            kws = set(kw.lower() for kw in t.get("keywords", []))
            # Also add words from title
            title_words = set(re.findall(r"\w+", t.get("title", "").lower()))
            topic_map[t_idx] = {
                "topic_index": t_idx,
                "title": t.get("title", ""),
                "keywords": kws.union(title_words) - set(ADMINISTRATIVE_WORDS),
                "key_concepts": t.get("key_concepts", []),
            }

        valid_topic_indices = sorted(topic_map.keys())
        clustered_materials: Dict[int, List[TopicMaterialItem]] = {
            t_idx: [] for t_idx in valid_topic_indices
        }

        # Collect every module from all sections
        seen_module_ids: Set[int] = set()

        for s in sections:
            sec_name = (s.get("name") or "").strip()
            sec_idx_match = re.search(
                r"\b(?:topic|тема|week|тиждень|lecture|лекція|seminar|семінар|module|модуль)\s*(\d+)",
                sec_name,
                flags=re.IGNORECASE,
            )
            sec_suggested_idx = int(sec_idx_match.group(1)) if sec_idx_match else None

            modules = s.get("modules", [])
            for m in modules:
                m_id = int(m.get("id") or m.get("module_id") or 0)
                if m_id and m_id in seen_module_ids:
                    continue
                if m_id:
                    seen_module_ids.add(m_id)

                m_name = (m.get("name") or "Матеріал").strip()
                m_mod = (m.get("modname") or "resource").lower()
                m_url = m.get("url") or ""
                m_desc = clean_html_and_formatting(m.get("description") or m.get("summary") or "")

                # 1. Detect material type
                mat_type = detect_material_type(
                    name=m_name,
                    modname=m_mod,
                    url=m_url,
                    mimetype=m.get("mimetype"),
                    files=m.get("files"),
                    description=m_desc,
                )

                # 2. Check for zero-token video transcription if video
                transcript_text = ""
                has_transcript = False
                if mat_type == "video" or "youtube" in m_url.lower() or "youtu.be" in m_url.lower():
                    try:
                        transcription = VideoTranscriberService.transcribe_video_module(m)
                        if transcription and transcription.get("full_text"):
                            transcript_text = transcription["full_text"]
                            has_transcript = True
                            logger.info(f"Zero-token transcription success for '{m_name}' ({len(transcript_text)} chars).")
                    except Exception as err:
                        logger.debug(f"Transcription error for {m_name}: {err}")

                # 3. Build comprehensive content text for analysis
                full_content_text = f"{m_name}\n{sec_name}\n{m_desc}\n{transcript_text}".strip()

                # 4. Extract structured key-items
                key_items = MaterialTextAnalyzer.extract_key_items(
                    text=f"{m_desc} {transcript_text[:1500]}",
                    title=m_name,
                    material_type=mat_type,
                    max_items=4,
                )

                # 5. Compute clustering score for each canonical topic
                best_topic_idx = valid_topic_indices[0]
                best_score = -1.0

                # Check if material or section explicitly mentions topic number
                mat_idx_match = re.search(
                    r"\b(?:topic|тема|week|тиждень|lecture|лекція|seminar|семінар|quiz|квіз|test|тест|l)\s*(\d+)",
                    f"{m_name} {m_desc}",
                    flags=re.IGNORECASE,
                )
                explicit_num = int(mat_idx_match.group(1)) if mat_idx_match else sec_suggested_idx

                for t_idx in valid_topic_indices:
                    t_info = topic_map[t_idx]
                    score = 0.0

                    # A. Explicit topic/week number alignment (highest confidence)
                    if explicit_num is not None:
                        if explicit_num == t_idx:
                            score += 50.0
                        else:
                            score -= 20.0

                    # B. Content keyword overlap
                    content_tokens = set(re.findall(r"\w+", full_content_text.lower()))
                    overlap = t_info["keywords"].intersection(content_tokens)
                    score += len(overlap) * 5.0

                    # C. Check exact title match or sub-concepts in content
                    for concept in t_info["key_concepts"]:
                        concept_words = set(re.findall(r"\w+", concept.lower())) - set(ADMINISTRATIVE_WORDS)
                        if concept_words and len(concept_words.intersection(content_tokens)) >= 2:
                            score += 8.0

                    if score > best_score:
                        best_score = score
                        best_topic_idx = t_idx

                # If no strong match and material is exam/colloquium review, default logically
                item = TopicMaterialItem(
                    id=m_id or (10000 + len(clustered_materials[best_topic_idx]) + 1),
                    name=m_name,
                    material_type=mat_type,
                    url=m_url or None,
                    description=m_desc[:500] if m_desc else None,
                    key_items=key_items,
                    time_created=m.get("timecreated") or m.get("timemodified") or None,
                    has_transcript=has_transcript,
                    transcript_snippet=transcript_text[:300] if has_transcript else None,
                )
                clustered_materials[best_topic_idx].append(item)

        total_clustered = sum(len(items) for items in clustered_materials.values())
        logger.info(f"Clustering complete: {total_clustered} materials clustered into {len(canonical_topics)} topics.")
        return clustered_materials
