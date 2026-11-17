import html
import logging
import re
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger("text_analyzer")

# Common stop words in Ukrainian and English to avoid inflating keyword density
STOP_WORDS: Set[str] = {
    "і", "в", "на", "з", "до", "для", "про", "як", "що", "це", "за", "по", "від", "при",
    "або", "та", "не", "чи", "ми", "ви", "він", "вона", "вони", "його", "її", "їх",
    "але", "тому", "так", "дуже", "всі", "тут", "там", "де", "коли", "бути", "був", "буде",
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "as", "is", "are", "was", "were", "be", "been", "this", "that", "it",
    "course", "topic", "week", "material", "materials", "file", "download", "link",
}

# Educational concept patterns signaling definitions and key takeaways
DEFINITION_MARKERS = [
    r"\b(?:це|є|визначається як|являє собою|полягає в|означає)\b",
    r"\b(?:is defined as|refers to|means|is a|are considered|consists of)\b",
    r"\b(?:ключов(?:і|а|е)|важлив(?:о|ий)|основн(?:ий|а|е)|головн(?:ий|а|е))\b",
    r"\b(?:розглядається|вивчається|досліджується|пояснюється|подано)\b",
    r"\b(?:covers|focuses on|demonstrates|explains|provides|discusses)\b",
]


def clean_html_and_formatting(raw: str) -> str:
    """Strip HTML tags, decode entities, and normalize whitespace."""
    if not raw:
        return ""
    # Decode HTML entities
    unescaped = html.unescape(raw)
    # Remove script and style elements
    no_scripts = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", unescaped, flags=re.DOTALL | re.IGNORECASE)
    # Remove HTML tags
    no_tags = re.sub(r"<[^>]+>", " ", no_scripts)
    # Remove markdown link syntax [text](url) -> text
    no_md_links = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", no_tags)
    # Remove markdown headers and asterisks
    no_md = re.sub(r"[#*_`~]+", " ", no_md_links)
    # Normalize excessive whitespace
    return re.sub(r"\s+", " ", no_md).strip()


def detect_material_type(
    name: str,
    modname: str,
    url: Optional[str] = None,
    mimetype: Optional[str] = None,
    files: Optional[List[Dict[str, Any]]] = None,
    description: Optional[str] = None,
) -> str:
    """
    Classify a Moodle module into an academic content category:
    'video' | 'audio' | 'lecture' | 'self_test' | 'assignment' | 'resource' | 'url'
    """
    clean_name = (name or "").lower()
    clean_mod = (modname or "").lower()
    clean_url = (url or "").lower()
    clean_mime = (mimetype or "").lower()
    clean_desc = (description or "").lower()

    # 1. Check direct MIME type
    if clean_mime.startswith("video/"):
        return "video"
    if clean_mime.startswith("audio/"):
        return "audio"

    # 2. Check attached files extensions
    all_files = list(files or [])
    for f in all_files:
        fn = (f.get("filename") or f.get("name") or "").lower()
        fm = (f.get("mimetype") or "").lower()
        if fm.startswith("video/") or fn.endswith((".mp4", ".webm", ".mkv", ".mov", ".avi")):
            return "video"
        if fm.startswith("audio/") or fn.endswith((".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac")):
            return "audio"
        if fn.endswith((".pdf", ".ppt", ".pptx", ".doc", ".docx", ".odt")):
            return "lecture"

    # 3. Check video hosting URLs
    video_domains = (
        "youtube.com", "youtu.be", "vimeo.com", "panopto", "loom.com",
        "stream.switch.ch", "kaltura", "zoom.us/rec", "/video/", ".mp4",
    )
    if any(vd in clean_url for vd in video_domains):
        return "video"

    # 4. Check audio hosting URLs
    audio_domains = ("soundcloud.com", "spotify.com", "anchor.fm", "podbean", "/audio/", ".mp3", ".wav")
    if any(ad in clean_url for ad in audio_domains):
        return "audio"

    # 5. Check keywords in title and description for video
    video_keywords = (
        "відео", "video", "recording", "запис лекції", "запис заняття",
        "вебінар", "webinar", "screencast", "скрінкаст", "відеозапис", "zoom recording"
    )
    if any(re.search(rf"\b{re.escape(k)}\b", clean_name) for k in video_keywords):
        return "video"
    if any(re.search(rf"\b{re.escape(k)}\b", clean_desc) for k in video_keywords):
        return "video"

    # 6. Check keywords in title and description for audio
    audio_keywords = ("аудіо", "audio", "podcast", "подкаст", "звукозапис", "аудіолекція")
    if any(re.search(rf"\b{re.escape(k)}\b", clean_name) for k in audio_keywords):
        return "audio"

    # 7. Quizzes and Self-Tests
    if clean_mod in ("quiz", "feedback", "choice"):
        return "self_test"

    # 8. Assignments and submissions
    if clean_mod in ("assign", "assignment", "workshop"):
        return "assignment"

    # 9. Lecture slides, reading notes, and presentations
    lecture_keywords = (
        "лекція", "lecture", "slides", "слайди", "конспект", "презентація",
        "notes", "handout", "chapter", "розділ", "підручник", "reading"
    )
    if any(re.search(rf"\b{re.escape(k)}\b", clean_name) for k in lecture_keywords):
        return "lecture"
    if clean_mod in ("resource", "page", "book", "folder"):
        return "lecture"

    if clean_mod == "url":
        return "url"

    return "resource"


class MaterialTextAnalyzer:
    """
    Advanced text analysis algorithm that extracts structured, high-value key items
    from lecture notes, video summaries, audio descriptions, and self-tests.
    """

    @staticmethod
    def _split_into_sentences(text: str) -> List[str]:
        """Split text into individual sentences while preserving technical acronyms."""
        cleaned = clean_html_and_formatting(text)
        if not cleaned:
            return []

        # Replace common abbreviations with placeholders to prevent erroneous splits
        abbrevs = {
            r"\bнапр\.": "напр_DOT_",
            r"\bпроф\.": "проф_DOT_",
            r"\bдоц\.": "доц_DOT_",
            r"\bім\.": "ім_DOT_",
            r"\be\.g\.": "eg_DOT_",
            r"\bi\.e\.": "ie_DOT_",
            r"\betc\.": "etc_DOT_",
            r"\bvs\.": "vs_DOT_",
            r"\bO\(": "O_LPAREN_",
        }
        temp = cleaned
        for pat, repl in abbrevs.items():
            temp = re.sub(pat, repl, temp, flags=re.IGNORECASE)

        # Split on sentence terminals
        raw_sentences = re.split(r"(?<=[.!?])\s+", temp)

        sentences = []
        for s in raw_sentences:
            s_restored = s.replace("напр_DOT_", "напр.") \
                          .replace("проф_DOT_", "проф.") \
                          .replace("доц_DOT_", "доц.") \
                          .replace("ім_DOT_", "ім.") \
                          .replace("eg_DOT_", "e.g.") \
                          .replace("ie_DOT_", "i.e.") \
                          .replace("etc_DOT_", "etc.") \
                          .replace("vs_DOT_", "vs.") \
                          .replace("O_LPAREN_", "O(")
            clean_s = s_restored.strip(" \t\n\r-–—•*")
            if len(clean_s) >= 15:
                sentences.append(clean_s)

        return sentences

    @classmethod
    def _score_sentence(cls, sentence: str, position_index: int, title: str) -> float:
        """
        Score a sentence based on educational significance, definition markers,
        keyword overlap with title, and informative length.
        """
        score = 1.0
        s_lower = sentence.lower()

        # 1. Definition & concept markers
        for marker in DEFINITION_MARKERS:
            if re.search(marker, s_lower):
                score += 3.5
                break

        # 2. Mathematical formulas, Big-O, code markers
        if re.search(r"\bO\([Nnlog0-9]+\)|\b[A-Za-z0-9_]+\(\)|\b\d+%", sentence):
            score += 2.0

        # 3. Overlap with material title keywords
        title_words = [
            w for w in re.sub(r"[^\w\s]", " ", title.lower()).split()
            if len(w) >= 3 and w not in STOP_WORDS
        ]
        overlap_count = sum(1 for w in title_words if w in s_lower)
        score += overlap_count * 1.5

        # 4. Length quality: preferred range 30-150 chars
        length = len(sentence)
        if 35 <= length <= 160:
            score += 1.5
        elif length < 25 or length > 220:
            score -= 1.0

        # 5. Position bonus (introductory points are often higher level)
        if position_index == 0:
            score += 2.0
        elif position_index == 1:
            score += 1.0

        return max(score, 0.1)

    @classmethod
    def extract_key_items(
        cls,
        text: str,
        title: str = "",
        material_type: str = "lecture",
        max_items: int = 4,
    ) -> List[str]:
        """
        Primary algorithm: parses and synthesizes key items / takeaways
        specifically for a given material and its type.
        """
        cleaned_text = clean_html_and_formatting(text or "")
        title_clean = clean_html_and_formatting(title or "")

        # 1. Check if the text already contains bullet points / list items
        bullet_matches = re.findall(r"(?:^|\n)\s*[-*•–—\d+\.]\s+([^\n]{15,180})", text or "")
        if bullet_matches:
            cleaned_bullets = [
                re.sub(r"^[A-Za-z0-9_]+\s*[:–-]\s*", "", b.strip())
                for b in bullet_matches
                if len(b.strip()) >= 15
            ]
            if len(cleaned_bullets) >= 2:
                # Deduplicate and return top bullets
                unique_bullets = []
                seen = set()
                for b in cleaned_bullets:
                    b_norm = b.lower()[:30]
                    if b_norm not in seen:
                        seen.add(b_norm)
                        unique_bullets.append(b)
                        if len(unique_bullets) >= max_items:
                            break
                if unique_bullets:
                    return unique_bullets

        # 2. Extract and rank sentences from text body
        key_items: List[str] = []
        sentences = cls._split_into_sentences(cleaned_text)
        if sentences:
            scored = [
                (cls._score_sentence(s, idx, title_clean), s)
                for idx, s in enumerate(sentences)
            ]
            scored.sort(key=lambda x: x[0], reverse=True)

            seen_prefixes = set()

            for _, s in scored:
                norm_prefix = s.lower()[:35]
                if norm_prefix not in seen_prefixes:
                    seen_prefixes.add(norm_prefix)
                    # Capitalize first letter and format
                    formatted_s = s[0].upper() + s[1:]
                    if not formatted_s.endswith((".", "!", "?")):
                        formatted_s += "."
                    key_items.append(formatted_s)
                    if len(key_items) >= max_items:
                        break

            if len(key_items) >= 2:
                return key_items

        # 3. Fallback / Sparse Text Synthesizer:
        # If fewer than 2 items were extracted from prose, supplement with synthesized domain items
        synthesized = cls._synthesize_from_title_and_type(title_clean, material_type)
        combined = list(key_items)
        for synth in synthesized:
            if synth not in combined:
                combined.append(synth)
            if len(combined) >= max_items:
                break

        return combined

    @classmethod
    def _synthesize_from_title_and_type(cls, title: str, material_type: str) -> List[str]:
        """Synthesize descriptive key items when full text is concise or inaccessible."""
        clean = title.strip()
        # Remove extension suffix (.pdf, .pptx, etc.)
        clean_clean = re.sub(r"\.[a-zA-Z0-9]{2,4}$", "", clean)
        clean_clean = re.sub(r"^(?:Lecture|Лекція|Тема|Topic|Lab|Лаб)\s*\d*\s*[:\-–]\s*", "", clean_clean, flags=re.IGNORECASE).strip()
        topic_subject = clean_clean if len(clean_clean) >= 4 else clean

        if material_type == "video":
            return [
                f"Відеозапис заняття: огляд та практичний розбір теми «{topic_subject}».",
                "Демонстрація ключових прикладів, типових помилок та програмної реалізації.",
                "Візуальне пояснення теоретичних механізмів та алгоритмічних кроків.",
            ]
        elif material_type == "audio":
            return [
                f"Аудіо-огляд та подкаст з теоретичних засад теми «{topic_subject}».",
                "Поглиблене обговорення концептуальних запитань та практичного контексту.",
                "Зручний формат для повторення матеріалу та підготовки до обговорень.",
            ]
        elif material_type == "self_test":
            return [
                f"Самоперевірка знань: тестові завдання за матеріалами «{topic_subject}».",
                "Концептуальні питання з миттєвим зворотним зв'язком.",
                "Формативне оцінювання без обмеження на кількість спроб для закріплення.",
            ]
        elif material_type == "assignment":
            return [
                f"Практичне завдання / лабораторна робота за темою «{topic_subject}».",
                "Самостійна реалізація вимог завдання та проходження тестів.",
                "Закріплення теоретичних знань на практиці перед дедлайном.",
            ]
        else:
            # Default lecture / slides / resource
            return [
                f"Теоретичні основи та структурований виклад теми «{topic_subject}».",
                "Ключові визначення, формули та системні принципи функціонування.",
                "Опорні матеріали для підготовки до практичних завдань та іспиту.",
            ]


# Administrative noise words that must NEVER pollute educational keywords or topic concepts
ADMINISTRATIVE_WORDS: Set[str] = {
    "topic", "тема", "week", "тиждень", "module", "модуль", "part", "частина",
    "reading", "читання", "quiz", "квіз", "test", "тест", "self-test", "самоперевірка",
    "seminar", "семінар", "workshop", "воркшоп", "lab", "лабораторна", "assignment", "завдання",
    "colloquium", "колоквіум", "midterm", "мідтерм", "exam", "екзамен", "іспит",
    "lecture", "лекція", "slides", "слайди", "notes", "конспект", "handout", "chapter", "розділ",
    "course", "курс", "syllabus", "силабус", "information", "інформація", "general", "загальне",
    "announcements", "оголошення", "forum", "форум", "material", "матеріал", "materials", "матеріали",
    "self", "all", "these", "are", "no", "concepts", "just", "labels",
}

ADMIN_LABEL_PATTERNS = [
    # Topic / Week / Part headers (e.g. #Topic 4, #тиждень 4, #week 4, #тема 4, #part ii: random variables)
    r"^(?:#+|\s*)*(?:topic|тема|week|тиждень|module|модуль|part|частина|chapter|розділ)\s*(?:[0-9ivxLCDM]+)?\s*[:.\-–]?\s*(?:random\s+variables|випадкові\s+величини)?$",
    # Reading labels (e.g. #Reading for topic 4, Reading for topic 5)
    r"^(?:#+|\s*)*(?:reading|читання|матеріали|materials|slides|слайди|notes|конспект|book|книга)\s*(?:for|to|до|з|по)?\s*(?:topic|тема|week|тиждень|lecture|лекція)?\s*([0-9ivxLCDM]+)?$",
    # Quiz / Test / Assessment labels (e.g. #Quiz 4, #test on topic 5, #test 6, #Self-test on Topic 4, #Module 2 Final Assessment)
    r"^(?:#+|\s*)*(?:quiz|квіз|тест|test|self[- ]?test|самоперевірка|контрольна|assessment|оцінювання|final\s+assessment)\s*(?:for|on|до|з|по|№)?\s*(?:topic|тема|week|тиждень|module|модуль)?\s*([0-9ivxLCDM]+)?.*$",
    # Seminar / Lab labels (e.g. #Seminar 4, #Seminar 5, #Seminar 6, #Lab 2)
    r"^(?:#+|\s*)*(?:seminar|семінар|workshop|воркшоп|lab|лабораторна|assignment|завдання|homework|дз|практикум|practice)\s*([0-9ivxLCDM]+)?.*$",
    # Colloquium & Midterms (e.g. #Colloquium, #midterm exam, #Colloquium 2, #Midterm exam 2)
    r"^(?:#+|\s*)*(?:colloquium|колоквіум|midterm|мідтерм|midterm\s+exam|екзамен|exam|final|фінал|іспит|підсумок)\s*([0-9ivxLCDM]+)?.*$",
    # Module assessment tests (e.g. #test for module 2, #Lab assignment 2)
    r"^(?:#+|\s*)*(?:test\s+for\s+module|lab\s+assignment|контрольна\s+робота|підсумковий\s+тест|module\s*\d*\s*final\s*assessment)\s*([0-9ivxLCDM]+)?.*$",
]

# Academic knowledge base for standard university domains (Math, Probability, Stats, CS)
CONCEPT_KNOWLEDGE_BASE = {
    "discrete random variables": {
        "title_uk": "Дискретні випадкові величини (Discrete Random Variables)",
        "summary": "Дослідження дискретних випадкових величин, законів розподілу ймовірностей (PMF), кумулятивної функції розподілу (CDF), а також біноміального та пуассонівського розподілів.",
        "key_concepts": [
            "Дискретна випадкова величина та її закон розподілу",
            "Функція маси ймовірності (PMF)",
            "Кумулятивна функція розподілу (CDF)",
            "Біноміальний та пуассонівський розподіли",
            "Математичні характеристики дискретних величин"
        ],
        "keywords": [
            "discrete random variables", "random variables", "probability mass function",
            "pmf", "cumulative distribution function", "cdf", "binomial distribution",
            "poisson distribution", "дискретні випадкові величини", "випадкова величина",
            "функція маси ймовірності", "функція розподілу", "дискретний розподіл"
        ]
    },
    "expectation": {
        "title_uk": "Математичне сподівання та числові характеристики (Expectation)",
        "summary": "Теоретичні основи математичного сподівання, лінійність сподівання, обчислення дисперсії, стандартного відхилення, коваріації та моментів випадкових величин.",
        "key_concepts": [
            "Математичне сподівання (Expected Value)",
            "Властивості та лінійність математичного сподівання",
            "Дисперсія (Variance) та стандартне відхилення",
            "Коваріація, кореляція та незалежність",
            "Нерівності Маркова та Чебишова"
        ],
        "keywords": [
            "expectation", "expected value", "variance", "standard deviation",
            "covariance", "linearity of expectation", "moments",
            "математичне сподівання", "сподівання", "дисперсія", "середнє значення",
            "коваріація", "числові характеристики"
        ]
    },
    "continuous random variables": {
        "title_uk": "Неперервні випадкові величини (Continuous Random Variables)",
        "summary": "Аналіз неперервних випадкових величин, густини розподілу ймовірностей (PDF), функції розподілу (CDF) та фундаментальних розподілів (нормальний, експоненційний, рівномірний).",
        "key_concepts": [
            "Неперервні випадкові величини та їх характеристики",
            "Густина розподілу ймовірностей (PDF)",
            "Кумулятивна функція розподілу (CDF)",
            "Нормальний (гауссівський) розподіл",
            "Експоненційний та рівномірний розподіли"
        ],
        "keywords": [
            "continuous random variables", "probability density function", "pdf",
            "cumulative distribution", "normal distribution", "gaussian distribution",
            "exponential distribution", "uniform distribution",
            "неперервні випадкові величини", "густина ймовірності", "функція розподілу", "нормальний розподіл"
        ]
    }
}


class CurriculumConceptParser:
    """
    Parser that filters out administrative noise labels ('Topic 4', 'Quiz 4', 'Reading for topic 4', 'Seminar 4')
    and structures courses strictly according to substantive academic concepts.
    """

    @classmethod
    def is_administrative_label(cls, text: str) -> bool:
        """Check whether a line or module name is purely an administrative container label."""
        cleaned = re.sub(r"^#+\s*", "", text or "").strip().lower()
        if not cleaned:
            return True
        for pattern in ADMIN_LABEL_PATTERNS:
            if re.match(pattern, cleaned, flags=re.IGNORECASE):
                return True
        # Check single words that are administrative
        if cleaned in ADMINISTRATIVE_WORDS:
            return True
        return False

    @classmethod
    def clean_concept_name(cls, raw_title: str) -> str:
        """Strip administrative prefix (e.g. 'Topic 4: Discrete RV' -> 'Discrete RV')."""
        clean = re.sub(r"^#+\s*", "", raw_title or "").strip()
        # Remove Topic/Week/Lecture numbers at the beginning
        clean = re.sub(
            r"^(?:topic|тема|week|тиждень|lecture|лекція|module|модуль|chapter|розділ)\s*[0-9ivxLCDM]*\s*[:.\-–]\s*",
            "",
            clean,
            flags=re.IGNORECASE,
        ).strip()
        # Remove trailing extensions
        clean = re.sub(r"\.[a-zA-Z0-9]{2,4}$", "", clean).strip()
        return clean

    @classmethod
    def expand_concept_metadata(cls, concept: str, topic_index: int, target_score: int = 85) -> Dict[str, Any]:
        """
        Produce high-quality academic metadata, key concepts, and clean domain keywords
        for a given academic concept without ANY administrative labels.
        """
        clean = cls.clean_concept_name(concept)
        concept_lower = clean.lower()
        diff = "Basic" if topic_index <= 1 else ("Advanced" if (topic_index >= 3 and target_score >= 85) else "Intermediate")

        # Check knowledge base first
        for kb_key, kb_val in CONCEPT_KNOWLEDGE_BASE.items():
            if kb_key in concept_lower or concept_lower in kb_key:
                return {
                    "topic_index": topic_index,
                    "title": f"Тема {topic_index}: {kb_val['title_uk']}",
                    "summary": kb_val["summary"],
                    "key_concepts": kb_val["key_concepts"],
                    "keywords": kb_val["keywords"],
                    "difficulty": diff,
                    "estimated_hours": 4 if target_score < 85 else 6,
                    "suggested_focus": f"Опанування теоретичних властивостей та типових задач для досягнення {target_score}%",
                }

        # Dynamic Concept Synthesis:
        # Extract technical nouns and build real academic keywords
        clean_words = [
            w for w in re.sub(r"[^\w\s]", " ", clean).split()
            if len(w) >= 3 and w.lower() not in ADMINISTRATIVE_WORDS and w.lower() not in STOP_WORDS
        ]

        title_display = f"Тема {topic_index}: {clean}"
        concepts = [
            f"Основи та фундаментальні принципи: {clean}",
            f"Теоретичні властивості та визначення ({clean})",
            f"Практичне застосування та розв'язання задач",
            f"Аналіз типових помилок та граничних випадків",
        ]
        keywords = [
            w.lower() for w in clean_words
        ] + [clean.lower()]
        # Filter strictly
        clean_keywords = [
            kw for kw in set(keywords)
            if kw not in ADMINISTRATIVE_WORDS and len(kw) >= 3
        ]

        return {
            "topic_index": topic_index,
            "title": title_display,
            "summary": f"Поглиблений розбір теми '{clean}': теоретичні засади, математичні моделі та розбір типових кейсів.",
            "key_concepts": concepts,
            "keywords": clean_keywords,
            "difficulty": diff,
            "estimated_hours": 4 if target_score < 85 else 5,
            "suggested_focus": f"Опанування ключових концептів розділу для цільового балу {target_score}%",
        }

    @classmethod
    def parse_curriculum_text(cls, text: str, target_score: int = 85) -> List[Dict[str, Any]]:
        """
        Parse raw syllabus / curriculum dump into structured topics following
        the substantive academic concepts, filtering out container labels.
        """
        if not text or not text.strip():
            return []

        # 1. Normalize lines and merge broken wraps (e.g. '#Self' + '#test on Topic 4' -> '#Self-test on Topic 4')
        raw_lines = [l.strip() for l in text.split("\n") if l.strip()]
        merged_lines: List[str] = []
        i = 0
        while i < len(raw_lines):
            line = raw_lines[i]
            if line in ("#Self", "Self", "#self", "self") and i + 1 < len(raw_lines):
                next_l = raw_lines[i + 1]
                if re.match(r"^#?test", next_l, flags=re.IGNORECASE):
                    merged_lines.append(f"Self-{re.sub(r'^#?', '', next_l).strip()}")
                    i += 2
                    continue
            merged_lines.append(line)
            i += 1

        # 2. Group items into topics by topic number or concept shifts
        topics_buckets: List[Dict[str, Any]] = []
        current_bucket: Optional[Dict[str, Any]] = None
        current_num = 1

        for line in merged_lines:
            clean_l = re.sub(r"^#+\s*", "", line).strip()
            if not clean_l:
                continue

            # Check if this line signals a topic, week, or module boundary
            header_match = re.search(r"\b(?:topic|тема|week|тиждень|module|модуль|chapter|розділ)\s*(\d+)", clean_l, flags=re.IGNORECASE)
            if header_match:
                topic_n = int(header_match.group(1))
                current_num = topic_n
                current_bucket = {
                    "topic_index": topic_n,
                    "concept_candidates": [],
                    "activity_items": [],
                }
                topics_buckets.append(current_bucket)

                # Check if the line also contains a concept after the label (e.g. 'Module 1: Complexity' -> 'Complexity')
                after_label = re.sub(
                    r"^(?:topic|тема|week|тиждень|module|модуль|chapter|розділ)\s*\d+\s*[:.\-–]?\s*",
                    "",
                    clean_l,
                    flags=re.IGNORECASE,
                ).strip()
                if after_label and not cls.is_administrative_label(after_label):
                    current_bucket["concept_candidates"].append(after_label)
                continue

            if current_bucket is None:
                current_bucket = {
                    "topic_index": current_num,
                    "concept_candidates": [],
                    "activity_items": [],
                }
                topics_buckets.append(current_bucket)

            # Check if the line is an administrative label or substantive concept
            if cls.is_administrative_label(clean_l):
                current_bucket["activity_items"].append(clean_l)
            else:
                # Substantive academic concept found!
                current_bucket["concept_candidates"].append(clean_l)

        # 3. Formulate topics from buckets
        structured_topics: List[Dict[str, Any]] = []
        seen_concepts = set()

        for bucket in topics_buckets:
            candidates = bucket["concept_candidates"]
            t_idx = bucket["topic_index"]

            # Filter candidates that are valid concepts
            valid_concepts = [
                c for c in candidates
                if not cls.is_administrative_label(c) and len(c) >= 4 and c.lower() not in seen_concepts
            ]

            if not valid_concepts:
                continue

            # The primary concept is the first substantive concept found in this topic
            primary_concept = valid_concepts[0]
            seen_concepts.add(primary_concept.lower())

            topic_meta = cls.expand_concept_metadata(primary_concept, t_idx, target_score=target_score)
            structured_topics.append(topic_meta)

        # Fallback if no buckets yielded concepts
        if not structured_topics:
            # Fallback to inspecting all lines for non-administrative phrases
            for line in merged_lines:
                clean_l = re.sub(r"^#+\s*", "", line).strip()
                if not cls.is_administrative_label(clean_l) and len(clean_l) >= 4:
                    if clean_l.lower() not in seen_concepts:
                        seen_concepts.add(clean_l.lower())
                        idx = len(structured_topics) + 1
                        structured_topics.append(cls.expand_concept_metadata(clean_l, idx, target_score))

        return structured_topics

    @classmethod
    def extract_concept_from_section(cls, section: Dict[str, Any], default_index: int = 1) -> str:
        """
        Given a Moodle section dict, determine the true academic subject.
        If the section name is 'Topic 4' or 'Week 4', search its modules for the substantive concept.
        """
        sec_name = (section.get("name") or "").strip()
        clean_name = cls.clean_concept_name(sec_name)

        # If section name is already substantive, use it
        if clean_name and not cls.is_administrative_label(clean_name):
            return clean_name

        # Otherwise, inspect modules in this section
        for m in section.get("modules", []):
            m_name = (m.get("name") or "").strip()
            clean_m = cls.clean_concept_name(m_name)
            if clean_m and not cls.is_administrative_label(clean_m):
                return clean_m

        # Fallback to cleaned section name or index
        return clean_name or f"Розділ {default_index}"
