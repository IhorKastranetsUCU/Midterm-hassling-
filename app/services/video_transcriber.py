import logging
import re
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, urlparse

logger = logging.getLogger("video_transcriber")

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    YOUTUBE_TRANSCRIPT_AVAILABLE = True
except ImportError:
    YouTubeTranscriptApi = None  # type: ignore
    YOUTUBE_TRANSCRIPT_AVAILABLE = False


class VideoTranscriberService:
    """
    Zero-token video & audio transcription service.
    Extracts subtitles and transcripts from YouTube, WebVTT, and SRT tracks
    without sending tokens to LLMs (completely free, offline/direct HTTP).
    """

    @staticmethod
    def extract_youtube_video_id(url: str) -> Optional[str]:
        """Extract video ID from various YouTube URL formats."""
        if not url:
            return None
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower()

        if "youtube.com" in hostname:
            if parsed.path == "/watch":
                qs = parse_qs(parsed.query)
                return qs.get("v", [None])[0]
            elif parsed.path.startswith(("/embed/", "/v/", "/shorts/")):
                parts = parsed.path.strip("/").split("/")
                if len(parts) >= 2:
                    return parts[1]
        elif "youtu.be" in hostname:
            path = parsed.path.strip("/")
            if path:
                return path.split("/")[0]

        # Regex fallback
        match = re.search(r"(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})", url)
        if match:
            return match.group(1)
        return None

    @classmethod
    def get_youtube_transcript(
        cls,
        url: str,
        preferred_languages: Optional[List[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch YouTube transcript directly using YouTube's timedtext API.
        Cost: 0 tokens!
        """
        video_id = cls.extract_youtube_video_id(url)
        if not video_id:
            return None

        if not YOUTUBE_TRANSCRIPT_AVAILABLE or YouTubeTranscriptApi is None:
            logger.warning("youtube_transcript_api is not installed.")
            return None

        languages = preferred_languages or ["uk", "en", "ru", "de", "fr", "es"]

        try:
            # 1. Try preferred languages directly
            # In youtube-transcript-api, get_transcript accepts languages list
            transcript_list = YouTubeTranscriptApi().list(video_id)
            
            # Find best transcript
            transcript = None
            try:
                # Try finding manually created or generated transcript matching preferred languages
                transcript = transcript_list.find_transcript(languages)
            except Exception:
                # Fallback to any available transcript
                for t in transcript_list:
                    transcript = t
                    break

            if transcript:
                fetched = transcript.fetch()
                # Format full text and snippets with timestamps
                full_text_parts = []
                segments = []
                for entry in fetched:
                    # Entry has 'text', 'start', 'duration'
                    text_line = (entry.get("text", "") if isinstance(entry, dict) else entry.text).strip()
                    start_sec = entry.get("start", 0.0) if isinstance(entry, dict) else entry.start
                    if text_line:
                        full_text_parts.append(text_line)
                        m, s = divmod(int(start_sec), 60)
                        h, m = divmod(m, 60)
                        ts_str = f"{h:02d}:{m:02d}:{s:02d}" if h > 0 else f"{m:02d}:{s:02d}"
                        segments.append({
                            "timestamp": ts_str,
                            "start_seconds": start_sec,
                            "text": text_line,
                        })

                full_text = " ".join(full_text_parts)
                return {
                    "source": "youtube_captions",
                    "video_id": video_id,
                    "language": transcript.language_code,
                    "is_generated": transcript.is_generated,
                    "full_text": full_text,
                    "segments": segments,
                    "token_cost": 0,
                }
        except Exception as exc:
            logger.info(f"Could not retrieve YouTube transcript for {video_id}: {exc}")
            return None

        return None

    @staticmethod
    def parse_vtt_or_srt(sub_text: str) -> Dict[str, Any]:
        """
        Parse raw WebVTT or SRT subtitle text into plain text and timestamped segments.
        Cost: 0 tokens!
        """
        if not sub_text or not sub_text.strip():
            return {"full_text": "", "segments": [], "token_cost": 0}

        lines = sub_text.splitlines()
        segments = []
        full_text_parts = []

        current_timestamp = ""
        current_text_lines = []

        # Matches VTT/SRT timestamp lines like "00:01:20.000 --> 00:01:24.000" or "01:20 --> 01:24"
        ts_pattern = re.compile(r"(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)")

        for line in lines:
            trimmed = line.strip()
            if not trimmed or trimmed == "WEBVTT" or trimmed.startswith("NOTE"):
                continue

            # Check if this is a sequence number in SRT
            if trimmed.isdigit():
                continue

            match = ts_pattern.search(trimmed)
            if match:
                if current_timestamp and current_text_lines:
                    seg_text = " ".join(current_text_lines).strip()
                    if seg_text:
                        segments.append({"timestamp": current_timestamp, "text": seg_text})
                        full_text_parts.append(seg_text)
                    current_text_lines = []
                current_timestamp = match.group(1).split(".")[0].split(",")[0]
            else:
                # Remove inline formatting tags like <v ...>, <b>, <i>, <c.color>
                clean_line = re.sub(r"<[^>]+>", "", trimmed)
                if clean_line:
                    current_text_lines.append(clean_line)

        if current_timestamp and current_text_lines:
            seg_text = " ".join(current_text_lines).strip()
            if seg_text:
                segments.append({"timestamp": current_timestamp, "text": seg_text})
                full_text_parts.append(seg_text)

        return {
            "source": "subtitles",
            "full_text": " ".join(full_text_parts),
            "segments": segments,
            "token_cost": 0,
        }

    @classmethod
    def transcribe_video_module(cls, module_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        High-level helper to transcribe any video module with 0 tokens.
        Checks url for YouTube, then checks attached files for .vtt or .srt.
        """
        url = module_data.get("url") or ""
        # 1. Check YouTube
        if cls.extract_youtube_video_id(url):
            res = cls.get_youtube_transcript(url)
            if res:
                return res

        # 2. Check files for .vtt or .srt
        files = module_data.get("files") or []
        for f in files:
            fn = (f.get("filename") or f.get("name") or "").lower()
            if fn.endswith((".vtt", ".srt")):
                content = f.get("content") or ""
                if content:
                    parsed = cls.parse_vtt_or_srt(content)
                    if parsed.get("full_text"):
                        return parsed

        return None
