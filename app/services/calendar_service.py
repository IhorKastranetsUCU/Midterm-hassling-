"""Per-owner calendar storage, conflict/forbidden-hour rules, iCalendar (.ics) sync, and Google Calendar sync."""
from __future__ import annotations

import ipaddress
import json
import logging
import os
import re
import secrets
import socket
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone, tzinfo
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote, urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings

logger = logging.getLogger(__name__)

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
_BYDAY_MAP = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}


class _KyivFallbackTZ(tzinfo):
    """Lightweight Europe/Kyiv EET/EEST fallback when system tzdata is unavailable."""

    @staticmethod
    def _last_sunday(year: int, month: int) -> date:
        if month == 12:
            d = date(year, 12, 31)
        else:
            d = date(year, month + 1, 1) - timedelta(days=1)
        return d - timedelta(days=(d.weekday() + 1) % 7)

    def _is_dst(self, dt: datetime) -> bool:
        naive = dt.replace(tzinfo=None)
        start = datetime.combine(self._last_sunday(naive.year, 3), time(3, 0))
        end = datetime.combine(self._last_sunday(naive.year, 10), time(4, 0))
        return start <= naive < end

    def utcoffset(self, dt: Optional[datetime]) -> timedelta:
        if dt is None:
            return timedelta(hours=2)
        return timedelta(hours=3 if self._is_dst(dt) else 2)

    def dst(self, dt: Optional[datetime]) -> timedelta:
        if dt is None:
            return timedelta(0)
        return timedelta(hours=1 if self._is_dst(dt) else 0)

    def tzname(self, dt: Optional[datetime]) -> str:
        return "EEST" if (dt is not None and self._is_dst(dt)) else "EET"


def resolve_timezone(tz_name: str = "Europe/Kyiv") -> tzinfo:
    name = (tz_name or "Europe/Kyiv").strip() or "Europe/Kyiv"
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, Exception):
        if name in {"Europe/Kyiv", "Europe/Kiev"}:
            return _KyivFallbackTZ()
        if name.upper() == "UTC":
            return timezone.utc
        return _KyivFallbackTZ()


def parse_utc_iso(value: str) -> datetime:
    raw = str(value or "").strip()
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def to_utc_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat()


def validate_hhmm(value: str, fallback: str) -> str:
    candidate = str(value or "").strip()
    if _TIME_RE.match(candidate):
        return candidate
    raise ValueError(f"Невірний формат часу '{candidate}'. Очікується ГГ:ХХ.")


def _hhmm_to_minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _merge_intervals(intervals: List[Tuple[datetime, datetime]]) -> List[Tuple[datetime, datetime]]:
    if not intervals:
        return []
    ordered = sorted((min(a, b), max(a, b)) for a, b in intervals if b > a)
    merged: List[Tuple[datetime, datetime]] = []
    for start, end in ordered:
        if not merged or start > merged[-1][1]:
            merged.append((start, end))
        else:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
    return merged


def _intervals_overlap(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and a_end > b_start


class CalendarServiceError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class CalendarConflictError(CalendarServiceError):
    def __init__(self, message: str, conflicts: Optional[List[Dict[str, Any]]] = None):
        super().__init__(message, status_code=409)
        self.conflicts = conflicts or []


@dataclass(frozen=True)
class SlotCheckResult:
    allowed: bool
    reason: str
    conflicts: List[Dict[str, Any]]


def _validate_ics_url(raw_url: str) -> str:
    url = (raw_url or "").strip()
    if url.lower().startswith("webcal://"):
        url = "https://" + url[len("webcal://"):]
    parsed = urlparse(url)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc or not parsed.hostname:
        raise CalendarServiceError("Посилання має починатися з https:// або webcal://.", 400)
    if parsed.username or parsed.password:
        raise CalendarServiceError("Посилання з логіном/паролем у URL не підтримуються.", 400)
    host = parsed.hostname.lower().strip(".")
    if host in {"localhost", "localhost.localdomain"} or host.endswith(".local") or host.endswith(".internal"):
        raise CalendarServiceError("Локальні та внутрішні адреси заборонено для синхронізації.", 400)
    try:
        ip_obj = ipaddress.ip_address(host)
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_multicast or ip_obj.is_reserved:
            raise CalendarServiceError("Приватні IP-адреси заборонено для синхронізації.", 400)
    except ValueError:
        try:
            infos = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
            for info in infos:
                addr = info[4][0].split("%")[0]
                ip_obj = ipaddress.ip_address(addr)
                if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_multicast or ip_obj.is_reserved:
                    raise CalendarServiceError("Адреса календаря вказує на недоступну внутрішню мережу.", 400)
        except CalendarServiceError:
            raise
        except OSError:
            # DNS resolution happens during live fetch as well; allow offline parsing tests to validate later.
            pass
    return url


def _mask_ics_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path or ""
    if len(path) > 18:
        path = path[:10] + "…" + path[-8:]
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def _unfold_ics_lines(text: str) -> List[str]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    lines: List[str] = []
    for raw in normalized.split("\n"):
        if (raw.startswith(" ") or raw.startswith("\t")) and lines:
            lines[-1] += raw[1:]
        else:
            lines.append(raw)
    return lines


def _unescape_ics_text(value: str) -> str:
    return (
        value.replace("\\n", "\n")
        .replace("\\N", "\n")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .replace("\\\\", "\\")
        .strip()
    )


def _escape_ics_text(value: str) -> str:
    return (
        str(value or "")
        .replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


def _parse_ics_datetime(raw_val: str, params: Dict[str, str], default_tz: tzinfo) -> Tuple[datetime, bool]:
    val = raw_val.strip()
    is_date = params.get("VALUE", "").upper() == "DATE" or (len(val) == 8 and val.isdigit())
    tz_id = params.get("TZID", "").strip()
    tz = resolve_timezone(tz_id) if tz_id else default_tz
    if is_date:
        d = datetime.strptime(val[:8], "%Y%m%d").date()
        local_dt = datetime.combine(d, time(0, 0), tzinfo=tz)
        return local_dt.astimezone(timezone.utc), True
    if val.endswith("Z"):
        dt = datetime.strptime(val, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
        return dt, False
    if "T" in val:
        dt = datetime.strptime(val[:15], "%Y%m%dT%H%M%S").replace(tzinfo=tz)
        return dt.astimezone(timezone.utc), False
    d = datetime.strptime(val[:8], "%Y%m%d").date()
    return datetime.combine(d, time(0, 0), tzinfo=tz).astimezone(timezone.utc), True


def _parse_ics_duration(raw: str) -> timedelta:
    m = re.match(r"^(-)?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$", raw.strip())
    if not m:
        return timedelta(hours=1)
    sign = -1 if m.group(1) else 1
    weeks = int(m.group(2) or 0)
    days = int(m.group(3) or 0)
    hours = int(m.group(4) or 0)
    minutes = int(m.group(5) or 0)
    seconds = int(m.group(6) or 0)
    return sign * timedelta(weeks=weeks, days=days, hours=hours, minutes=minutes, seconds=seconds)


def _expand_rrule(
    dtstart_utc: datetime,
    duration: timedelta,
    rrule_str: str,
    local_tz: tzinfo,
    window_start: datetime,
    window_end: datetime,
    max_instances: int = 120,
) -> List[Tuple[datetime, datetime]]:
    parts = {}
    for token in rrule_str.split(";"):
        if "=" in token:
            k, v = token.split("=", 1)
            parts[k.strip().upper()] = v.strip().upper()

    freq = parts.get("FREQ")
    if freq not in {"DAILY", "WEEKLY"}:
        return [(dtstart_utc, dtstart_utc + duration)] if _intervals_overlap(dtstart_utc, dtstart_utc + duration, window_start, window_end) else []

    interval = max(1, min(52, int(parts.get("INTERVAL", "1") or 1)))
    count_limit = int(parts["COUNT"]) if parts.get("COUNT", "").isdigit() else None
    until_utc: Optional[datetime] = None
    if "UNTIL" in parts:
        try:
            until_utc, _ = _parse_ics_datetime(parts["UNTIL"], {}, local_tz)
        except Exception:
            until_utc = None

    byday = [_BYDAY_MAP[d[-2:]] for d in parts.get("BYDAY", "").split(",") if d[-2:] in _BYDAY_MAP]
    start_local = dtstart_utc.astimezone(local_tz)
    base_time = start_local.timetz()
    occurrences: List[Tuple[datetime, datetime]] = []
    emitted = 0

    if freq == "DAILY":
        cursor = start_local.date()
        if cursor < window_start.astimezone(local_tz).date() - timedelta(days=2) and count_limit is None:
            days_diff = (window_start.astimezone(local_tz).date() - cursor).days
            steps = max(0, (days_diff // interval) - 1)
            cursor = cursor + timedelta(days=steps * interval)
        horizon_date = min(window_end.astimezone(local_tz).date() + timedelta(days=1), (until_utc or window_end).astimezone(local_tz).date() + timedelta(days=1))
        while cursor <= horizon_date and len(occurrences) < max_instances:
            occ_local = datetime.combine(cursor, base_time.replace(tzinfo=None), tzinfo=local_tz)
            occ_utc = occ_local.astimezone(timezone.utc)
            if occ_utc >= dtstart_utc:
                if until_utc and occ_utc > until_utc:
                    break
                if not byday or occ_local.weekday() in byday:
                    emitted += 1
                    if count_limit and emitted > count_limit:
                        break
                    occ_end = occ_utc + duration
                    if _intervals_overlap(occ_utc, occ_end, window_start, window_end):
                        occurrences.append((occ_utc, occ_end))
            cursor += timedelta(days=interval)
    else:  # WEEKLY
        week_start_monday = start_local.date() - timedelta(days=start_local.weekday())
        weekdays = sorted(set(byday)) if byday else [start_local.weekday()]
        if week_start_monday < window_start.astimezone(local_tz).date() - timedelta(days=14) and count_limit is None:
            weeks_diff = ((window_start.astimezone(local_tz).date() - week_start_monday).days // 7)
            steps = max(0, (weeks_diff // interval) - 1)
            week_start_monday += timedelta(days=steps * 7 * interval)
        horizon_date = min(window_end.astimezone(local_tz).date() + timedelta(days=7), (until_utc or window_end).astimezone(local_tz).date() + timedelta(days=7))
        while week_start_monday <= horizon_date and len(occurrences) < max_instances:
            for wd in weekdays:
                day_date = week_start_monday + timedelta(days=wd)
                occ_local = datetime.combine(day_date, base_time.replace(tzinfo=None), tzinfo=local_tz)
                occ_utc = occ_local.astimezone(timezone.utc)
                if occ_utc < dtstart_utc:
                    continue
                if until_utc and occ_utc > until_utc:
                    return occurrences
                emitted += 1
                if count_limit and emitted > count_limit:
                    return occurrences
                occ_end = occ_utc + duration
                if _intervals_overlap(occ_utc, occ_end, window_start, window_end):
                    occurrences.append((occ_utc, occ_end))
                    if len(occurrences) >= max_instances:
                        break
            week_start_monday += timedelta(days=7 * interval)
    return occurrences


def parse_ics_events(
    ics_text: str,
    default_tz: tzinfo,
    window_start: datetime,
    window_end: datetime,
) -> List[Dict[str, Any]]:
    """Parse RFC 5545 VEVENT records from an iCalendar payload within [window_start, window_end)."""
    lines = _unfold_ics_lines(ics_text)
    events: List[Dict[str, Any]] = []
    cur: Optional[Dict[str, Tuple[str, Dict[str, str]]]] = None
    in_vevent = False

    for line in lines:
        upper = line.strip().upper()
        if upper == "BEGIN:VEVENT":
            cur = {}
            in_vevent = True
            continue
        if upper == "END:VEVENT" and in_vevent and cur is not None:
            in_vevent = False
            status_val = (cur.get("STATUS", ("", {}))[0]).strip().upper()
            if status_val == "CANCELLED" or "DTSTART" not in cur:
                cur = None
                continue
            try:
                dtstart_val, dtstart_params = cur["DTSTART"]
                start_utc, all_day = _parse_ics_datetime(dtstart_val, dtstart_params, default_tz)
                if "DTEND" in cur:
                    end_utc, _ = _parse_ics_datetime(cur["DTEND"][0], cur["DTEND"][1], default_tz)
                elif "DURATION" in cur:
                    end_utc = start_utc + _parse_ics_duration(cur["DURATION"][0])
                else:
                    end_utc = start_utc + (timedelta(days=1) if all_day else timedelta(hours=1))
                if end_utc <= start_utc:
                    end_utc = start_utc + (timedelta(days=1) if all_day else timedelta(minutes=30))
                duration = end_utc - start_utc
            except Exception:
                cur = None
                continue

            uid = (cur.get("UID", ("", {}))[0]).strip() or hashlib_fallback_uid(cur)
            summary = _unescape_ics_text(cur.get("SUMMARY", ("Подія", {}))[0]) or "Подія"
            description = _unescape_ics_text(cur.get("DESCRIPTION", ("", {}))[0])
            transp = (cur.get("TRANSP", ("OPAQUE", {}))[0]).strip().upper()
            is_free = transp == "TRANSPARENT"

            if "RRULE" in cur:
                instances = _expand_rrule(start_utc, duration, cur["RRULE"][0], default_tz, window_start, window_end)
            else:
                instances = [(start_utc, end_utc)] if _intervals_overlap(start_utc, end_utc, window_start, window_end) else []

            for occ_start, occ_end in instances:
                occ_id = f"{uid}__{int(occ_start.timestamp())}" if "RRULE" in cur else uid
                events.append({
                    "external_id": occ_id,
                    "title": summary[:220],
                    "description": description[:2000],
                    "start_at": to_utc_iso(occ_start),
                    "end_at": to_utc_iso(occ_end),
                    "all_day": all_day,
                    "status": "free" if is_free else "busy",
                })
            cur = None
            continue

        if in_vevent and cur is not None and ":" in line:
            prop_part, val_part = line.split(":", 1)
            segments = prop_part.split(";")
            prop_name = segments[0].strip().upper()
            params: Dict[str, str] = {}
            for seg in segments[1:]:
                if "=" in seg:
                    pk, pv = seg.split("=", 1)
                    params[pk.strip().upper()] = pv.strip().strip('"')
            if prop_name in {"UID", "SUMMARY", "DESCRIPTION", "DTSTART", "DTEND", "DURATION", "STATUS", "TRANSP", "RRULE"}:
                cur[prop_name] = (val_part, params)
    return events


def hashlib_fallback_uid(cur: Dict[str, Tuple[str, Dict[str, str]]]) -> str:
    raw = f"{cur.get('SUMMARY', ('', {}))[0]}|{cur.get('DTSTART', ('', {}))[0]}"
    return str(uuid.uuid5(uuid.NAMESPACE_URL, raw))


class CalendarStore:
    """Owner-isolated storage for calendar preferences, external sync sources, and events."""

    DEFAULT_SETTINGS: Dict[str, Any] = {
        "timezone": "Europe/Kyiv",
        "sleep_enabled": True,
        "sleep_start": "23:00",
        "sleep_end": "08:00",
        "forbidden_windows": [],
        "avoid_conflicts": True,
        "buffer_minutes": 10,
        "default_session_minutes": 60,
        "max_daily_study_minutes": 240,
        "sync_deadlines": True,
    }

    def __init__(self, db_path: Optional[str] = None):
        settings = get_settings()
        self.db_path = db_path or settings.WORKSPACE_DB_PATH
        parent = os.path.dirname(os.path.abspath(self.db_path))
        if parent:
            os.makedirs(parent, exist_ok=True)
        self.key_path = Path(self.db_path).absolute().parent / ".hustle-ai.key"
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=5)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA busy_timeout=5000")
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS calendar_settings (
                    owner_id TEXT PRIMARY KEY,
                    timezone TEXT NOT NULL DEFAULT 'Europe/Kyiv',
                    sleep_enabled INTEGER NOT NULL DEFAULT 1,
                    sleep_start TEXT NOT NULL DEFAULT '23:00',
                    sleep_end TEXT NOT NULL DEFAULT '08:00',
                    forbidden_windows_json TEXT NOT NULL DEFAULT '[]',
                    avoid_conflicts INTEGER NOT NULL DEFAULT 1,
                    buffer_minutes INTEGER NOT NULL DEFAULT 10,
                    default_session_minutes INTEGER NOT NULL DEFAULT 60,
                    max_daily_study_minutes INTEGER NOT NULL DEFAULT 240,
                    sync_deadlines INTEGER NOT NULL DEFAULT 1,
                    feed_token TEXT UNIQUE,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS calendar_deadline_reviews (
                    owner_id TEXT NOT NULL,
                    course_id INTEGER NOT NULL,
                    assignment_id INTEGER NOT NULL,
                    decision TEXT NOT NULL,
                    due_at TEXT NOT NULL,
                    PRIMARY KEY(owner_id, course_id, assignment_id)
                );

                CREATE TABLE IF NOT EXISTS calendar_sources (
                    source_id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    title TEXT NOT NULL,
                    calendar_ref TEXT NOT NULL,
                    credentials_blob BLOB,
                    sync_direction TEXT NOT NULL DEFAULT 'read',
                    enabled INTEGER NOT NULL DEFAULT 1,
                    last_synced_at TEXT,
                    last_error TEXT,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_calendar_sources_owner
                    ON calendar_sources (owner_id, provider);

                CREATE TABLE IF NOT EXISTS calendar_events (
                    event_key TEXT PRIMARY KEY,
                    event_id TEXT NOT NULL,
                    owner_id TEXT NOT NULL,
                    source_id TEXT,
                    external_id TEXT,
                    source_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    start_at TEXT NOT NULL,
                    end_at TEXT NOT NULL,
                    all_day INTEGER NOT NULL DEFAULT 0,
                    course_id INTEGER,
                    topic_index INTEGER,
                    status TEXT NOT NULL DEFAULT 'planned',
                    created_by TEXT NOT NULL DEFAULT 'user',
                    google_event_id TEXT,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_calendar_events_owner_range
                    ON calendar_events (owner_id, start_at, end_at);
                CREATE INDEX IF NOT EXISTS idx_calendar_events_external
                    ON calendar_events (owner_id, source_id, external_id);
                """
            )

    def _cipher(self, create: bool = False) -> Fernet:
        if not self.key_path.exists() and create:
            try:
                fd = os.open(self.key_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(fd, "wb") as stream:
                    stream.write(Fernet.generate_key())
            except FileExistsError:
                pass
        try:
            return Fernet(self.key_path.read_bytes())
        except (OSError, ValueError):
            raise CalendarServiceError("Не вдалося відкрити захищене сховище токенів календаря.", 500) from None

    def _encrypt_secret(self, owner_id: str, payload: Dict[str, Any]) -> bytes:
        wrapped = {"owner_id": owner_id, "payload": payload}
        return self._cipher(create=True).encrypt(json.dumps(wrapped).encode("utf-8"))

    def _decrypt_secret(self, owner_id: str, blob: bytes) -> Dict[str, Any]:
        try:
            data = json.loads(self._cipher().decrypt(blob))
        except (InvalidToken, ValueError, TypeError):
            raise CalendarServiceError("Пошкоджено збережені дані підключення календаря. Підключи повторно.", 400) from None
        if data.get("owner_id") != owner_id:
            raise CalendarServiceError("Невідповідність власника підключення календаря.", 403)
        return data.get("payload") or {}

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _row_to_settings(self, row: sqlite3.Row) -> Dict[str, Any]:
        try:
            windows = json.loads(row["forbidden_windows_json"] or "[]")
            if not isinstance(windows, list):
                windows = []
        except Exception:
            windows = []
        return {
            "timezone": row["timezone"],
            "sleep_enabled": bool(row["sleep_enabled"]),
            "sleep_start": row["sleep_start"],
            "sleep_end": row["sleep_end"],
            "forbidden_windows": windows,
            "avoid_conflicts": bool(row["avoid_conflicts"]),
            "buffer_minutes": int(row["buffer_minutes"]),
            "default_session_minutes": int(row["default_session_minutes"]),
            "max_daily_study_minutes": int(row["max_daily_study_minutes"]),
            "sync_deadlines": bool(row["sync_deadlines"]),
            "feed_token": row["feed_token"],
            "updated_at": row["updated_at"],
        }

    def get_settings(self, owner_id: str) -> Dict[str, Any]:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM calendar_settings WHERE owner_id = ?", (owner_id,)).fetchone()
            if row is not None:
                return self._row_to_settings(row)
            token = secrets.token_urlsafe(24)
            now = self._now_iso()
            conn.execute(
                """INSERT INTO calendar_settings (
                    owner_id, timezone, sleep_enabled, sleep_start, sleep_end,
                    forbidden_windows_json, avoid_conflicts, buffer_minutes,
                    default_session_minutes, max_daily_study_minutes, sync_deadlines,
                    feed_token, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    owner_id,
                    self.DEFAULT_SETTINGS["timezone"],
                    1,
                    self.DEFAULT_SETTINGS["sleep_start"],
                    self.DEFAULT_SETTINGS["sleep_end"],
                    "[]",
                    1,
                    self.DEFAULT_SETTINGS["buffer_minutes"],
                    self.DEFAULT_SETTINGS["default_session_minutes"],
                    self.DEFAULT_SETTINGS["max_daily_study_minutes"],
                    1,
                    token,
                    now,
                ),
            )
            row = conn.execute("SELECT * FROM calendar_settings WHERE owner_id = ?", (owner_id,)).fetchone()
            return self._row_to_settings(row)

    def save_settings(self, owner_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
        cur = self.get_settings(owner_id)
        tz_name = str(patch.get("timezone", cur["timezone"])).strip() or "Europe/Kyiv"
        sleep_enabled = bool(patch.get("sleep_enabled", cur["sleep_enabled"]))
        sleep_start = validate_hhmm(patch.get("sleep_start", cur["sleep_start"]), cur["sleep_start"])
        sleep_end = validate_hhmm(patch.get("sleep_end", cur["sleep_end"]), cur["sleep_end"])

        raw_windows = patch.get("forbidden_windows", cur["forbidden_windows"])
        clean_windows: List[Dict[str, Any]] = []
        if isinstance(raw_windows, list):
            for idx, w in enumerate(raw_windows[:20]):
                if not isinstance(w, dict):
                    continue
                ws = validate_hhmm(w.get("start_time", "09:00"), "09:00")
                we = validate_hhmm(w.get("end_time", "12:00"), "12:00")
                if ws == we:
                    raise CalendarServiceError("Початок і кінець забороненого інтервалу не можуть збігатися.", 400)
                weekdays = [int(d) for d in (w.get("weekdays") or []) if isinstance(d, int) or str(d).isdigit()]
                weekdays = sorted({d for d in weekdays if 0 <= d <= 6})
                clean_windows.append({
                    "id": str(w.get("id") or f"fw-{idx + 1}-{uuid.uuid4().hex[:6]}")[:40],
                    "label": str(w.get("label") or "Заборонений час").strip()[:60] or "Заборонений час",
                    "start_time": ws,
                    "end_time": we,
                    "weekdays": weekdays,
                    "enabled": bool(w.get("enabled", True)),
                })

        avoid_conflicts = bool(patch.get("avoid_conflicts", cur["avoid_conflicts"]))
        buffer_minutes = max(0, min(60, int(patch.get("buffer_minutes", cur["buffer_minutes"]))))
        default_session_minutes = max(15, min(240, int(patch.get("default_session_minutes", cur["default_session_minutes"]))))
        max_daily_study_minutes = max(30, min(720, int(patch.get("max_daily_study_minutes", cur["max_daily_study_minutes"]))))
        sync_deadlines = bool(patch.get("sync_deadlines", cur["sync_deadlines"]))
        now = self._now_iso()

        with self._connect() as conn:
            conn.execute(
                """UPDATE calendar_settings SET
                    timezone = ?, sleep_enabled = ?, sleep_start = ?, sleep_end = ?,
                    forbidden_windows_json = ?, avoid_conflicts = ?, buffer_minutes = ?,
                    default_session_minutes = ?, max_daily_study_minutes = ?,
                    sync_deadlines = ?, updated_at = ?
                WHERE owner_id = ?""",
                (
                    tz_name,
                    int(sleep_enabled),
                    sleep_start,
                    sleep_end,
                    json.dumps(clean_windows, ensure_ascii=False),
                    int(avoid_conflicts),
                    buffer_minutes,
                    default_session_minutes,
                    max_daily_study_minutes,
                    int(sync_deadlines),
                    now,
                    owner_id,
                ),
            )
        return self.get_settings(owner_id)

    def rotate_feed_token(self, owner_id: str) -> str:
        self.get_settings(owner_id)
        token = secrets.token_urlsafe(24)
        with self._connect() as conn:
            conn.execute(
                "UPDATE calendar_settings SET feed_token = ?, updated_at = ? WHERE owner_id = ?",
                (token, self._now_iso(), owner_id),
            )
        return token

    def get_owner_by_feed_token(self, token: str) -> Optional[str]:
        clean = (token or "").strip()
        if len(clean) < 16:
            return None
        with self._connect() as conn:
            row = conn.execute("SELECT owner_id FROM calendar_settings WHERE feed_token = ?", (clean,)).fetchone()
        return row["owner_id"] if row else None

    @staticmethod
    def _row_to_event(row: sqlite3.Row) -> Dict[str, Any]:
        return {
            "event_id": row["event_id"],
            "source_id": row["source_id"],
            "external_id": row["external_id"],
            "source_type": row["source_type"],
            "title": row["title"],
            "description": row["description"],
            "start_at": row["start_at"],
            "end_at": row["end_at"],
            "all_day": bool(row["all_day"]),
            "course_id": row["course_id"],
            "topic_index": row["topic_index"],
            "status": row["status"],
            "created_by": row["created_by"],
            "google_event_id": row["google_event_id"],
            "updated_at": row["updated_at"],
        }

    def list_events(
        self,
        owner_id: str,
        start_utc: Optional[datetime] = None,
        end_utc: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            if start_utc is not None and end_utc is not None:
                rows = conn.execute(
                    """SELECT * FROM calendar_events
                    WHERE owner_id = ? AND end_at > ? AND start_at < ?
                    ORDER BY start_at ASC""",
                    (owner_id, to_utc_iso(start_utc), to_utc_iso(end_utc)),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM calendar_events WHERE owner_id = ? ORDER BY start_at ASC",
                    (owner_id,),
                ).fetchall()
            events = [self._row_to_event(r) for r in rows]
            if any(ev["created_by"] == "moodle" for ev in events):
                due_dates = {(r["course_id"], str(r["assignment_id"])): r["due_at"] for r in conn.execute(
                    "SELECT course_id, assignment_id, due_at FROM calendar_deadline_reviews WHERE owner_id = ?", (owner_id,))}
                for ev in events:
                    if ev["created_by"] == "moodle":
                        ev["moodle_due_at"] = due_dates.get((ev["course_id"], ev["external_id"]))
        return events

    def get_event(self, owner_id: str, event_id: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM calendar_events WHERE event_key = ?",
                (f"{owner_id}:{event_id}",),
            ).fetchone()
        return self._row_to_event(row) if row else None

    def deadline_reviews(self, owner_id: str) -> dict:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT course_id, assignment_id, decision FROM calendar_deadline_reviews WHERE owner_id = ?", (owner_id,))
            return {(r["course_id"], r["assignment_id"]): r["decision"] for r in rows}

    def review_deadline(self, owner_id, course_id, assignment_id, deadline, decision):
        event_id = f"moodle-{course_id}-{assignment_id}"
        key = f"{owner_id}:{event_id}"
        # Commit the decision and calendar entry together, including on concurrent retries.
        with self._connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            existing = conn.execute("SELECT * FROM calendar_events WHERE event_key = ?", (key,)).fetchone()
            if existing:
                if decision == "declined":
                    raise CalendarServiceError("Спочатку прибери подію зі свого календаря.", 409)
                return self._row_to_event(existing), False
            start = datetime.fromtimestamp(deadline["duedate"], tz=timezone.utc)
            conn.execute("""INSERT INTO calendar_deadline_reviews VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(owner_id, course_id, assignment_id) DO UPDATE SET decision = excluded.decision""",
                (owner_id, course_id, assignment_id, decision, to_utc_iso(start)))
            if decision == "declined":
                return None, False
            conn.execute("""INSERT INTO calendar_events
                (event_key, event_id, owner_id, external_id, source_type, title, description, start_at, end_at,
                 course_id, created_by, updated_at) VALUES (?, ?, ?, ?, 'manual', ?, ?, ?, ?, ?, 'moodle', ?)""",
                (key, event_id, owner_id, str(assignment_id), deadline["name"], deadline.get("course_name") or "",
                 to_utc_iso(start), to_utc_iso(start + timedelta(minutes=1)), course_id, self._now_iso()))
            row = conn.execute("SELECT * FROM calendar_events WHERE event_key = ?", (key,)).fetchone()
            return self._row_to_event(row), True

    def expand_forbidden_intervals(
        self,
        settings: Dict[str, Any],
        window_start_utc: datetime,
        window_end_utc: datetime,
    ) -> List[Dict[str, Any]]:
        """Expand daily sleep and custom forbidden windows across [window_start_utc, window_end_utc)."""
        local_tz = resolve_timezone(settings.get("timezone", "Europe/Kyiv"))
        rules: List[Dict[str, Any]] = []
        if settings.get("sleep_enabled", True):
            rules.append({
                "id": "sleep",
                "label": "Сон (заборонені години)",
                "kind": "sleep",
                "start_time": settings.get("sleep_start", "23:00"),
                "end_time": settings.get("sleep_end", "08:00"),
                "weekdays": [],
                "enabled": True,
            })
        for fw in settings.get("forbidden_windows") or []:
            if fw.get("enabled", True):
                rules.append({**fw, "kind": "forbidden"})

        if not rules:
            return []

        first_day = window_start_utc.astimezone(local_tz).date() - timedelta(days=1)
        last_day = window_end_utc.astimezone(local_tz).date() + timedelta(days=1)
        blocks: List[Dict[str, Any]] = []
        day = first_day
        while day <= last_day:
            for rule in rules:
                weekdays = rule.get("weekdays") or []
                if weekdays and day.weekday() not in weekdays:
                    continue
                sh, sm = map(int, rule["start_time"].split(":"))
                eh, em = map(int, rule["end_time"].split(":"))
                start_local = datetime.combine(day, time(sh, sm), tzinfo=local_tz)
                end_day = day + timedelta(days=1) if (eh, em) <= (sh, sm) else day
                end_local = datetime.combine(end_day, time(eh, em), tzinfo=local_tz)
                start_u = start_local.astimezone(timezone.utc)
                end_u = end_local.astimezone(timezone.utc)
                if _intervals_overlap(start_u, end_u, window_start_utc, window_end_utc):
                    blocks.append({
                        "id": rule.get("id", "forbidden"),
                        "label": rule.get("label", "Заборонений час"),
                        "kind": rule.get("kind", "forbidden"),
                        "start_at": to_utc_iso(start_u),
                        "end_at": to_utc_iso(end_u),
                    })
            day += timedelta(days=1)
        blocks.sort(key=lambda item: item["start_at"])
        return blocks

    def check_slot_conflicts(
        self,
        owner_id: str,
        start_utc: datetime,
        end_utc: datetime,
        settings: Optional[Dict[str, Any]] = None,
        exclude_event_id: Optional[str] = None,
        check_forbidden: bool = True,
        check_existing: bool = True,
        buffer_minutes: int = 0,
    ) -> SlotCheckResult:
        if end_utc <= start_utc:
            return SlotCheckResult(False, "Час завершення має бути пізніше за початок.", [])

        cfg = settings or self.get_settings(owner_id)
        conflicts: List[Dict[str, Any]] = []

        if check_forbidden:
            for block in self.expand_forbidden_intervals(cfg, start_utc, end_utc):
                b_start = parse_utc_iso(block["start_at"])
                b_end = parse_utc_iso(block["end_at"])
                if _intervals_overlap(start_utc, end_utc, b_start, b_end):
                    conflicts.append({"type": block["kind"], "title": block["label"], "start_at": block["start_at"], "end_at": block["end_at"]})

        if check_existing:
            pad = timedelta(minutes=max(0, buffer_minutes))
            existing = self.list_events(owner_id, start_utc - pad, end_utc + pad)
            for ev in existing:
                if exclude_event_id and ev["event_id"] == exclude_event_id:
                    continue
                if ev.get("all_day") or ev.get("status") in {"free", "skipped"}:
                    continue
                ev_start = parse_utc_iso(ev["start_at"]) - pad
                ev_end = parse_utc_iso(ev["end_at"]) + pad
                if _intervals_overlap(start_utc, end_utc, ev_start, ev_end):
                    conflicts.append({
                        "type": "event",
                        "event_id": ev["event_id"],
                        "title": ev["title"],
                        "start_at": ev["start_at"],
                        "end_at": ev["end_at"],
                    })

        if not conflicts:
            return SlotCheckResult(True, "", [])
        first = conflicts[0]
        if first["type"] in {"sleep", "forbidden"}:
            reason = f"Час потрапляє в заборонений інтервал: {first['title']}."
        else:
            reason = f"У цей часовий проміжок уже є подія: «{first['title']}»."
        return SlotCheckResult(False, reason, conflicts)

    def create_event(
        self,
        owner_id: str,
        *,
        title: str,
        start_utc: datetime,
        end_utc: datetime,
        source_type: str = "manual",
        description: str = "",
        all_day: bool = False,
        course_id: Optional[int] = None,
        topic_index: Optional[int] = None,
        status: str = "planned",
        created_by: str = "user",
        check_conflicts: bool = True,
        allow_conflict: bool = False,
    ) -> Dict[str, Any]:
        clean_title = str(title or "").strip()[:220]
        if not clean_title:
            raise CalendarServiceError("Назва події обов'язкова.", 400)
        if end_utc <= start_utc:
            raise CalendarServiceError("Час завершення має бути пізніше за початок.", 400)

        cfg = self.get_settings(owner_id)
        if check_conflicts and not all_day and not allow_conflict and cfg.get("avoid_conflicts", True):
            check = self.check_slot_conflicts(
                owner_id,
                start_utc,
                end_utc,
                settings=cfg,
                check_forbidden=True,
                check_existing=True,
                buffer_minutes=0,
            )
            if not check.allowed:
                raise CalendarConflictError(check.reason, check.conflicts)

        event_id = f"ev-{uuid.uuid4().hex[:14]}"
        now = self._now_iso()
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO calendar_events (
                    event_key, event_id, owner_id, source_id, external_id, source_type,
                    title, description, start_at, end_at, all_day, course_id, topic_index,
                    status, created_by, google_event_id, updated_at
                ) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)""",
                (
                    f"{owner_id}:{event_id}",
                    event_id,
                    owner_id,
                    source_type,
                    clean_title,
                    str(description or "").strip()[:2000],
                    to_utc_iso(start_utc),
                    to_utc_iso(end_utc),
                    int(bool(all_day)),
                    int(course_id) if course_id is not None else None,
                    int(topic_index) if topic_index is not None else None,
                    status,
                    created_by,
                    now,
                ),
            )
        return self.get_event(owner_id, event_id)  # type: ignore[return-value]

    def update_event(
        self,
        owner_id: str,
        event_id: str,
        patch: Dict[str, Any],
        *,
        allow_conflict: bool = False,
    ) -> Dict[str, Any]:
        existing = self.get_event(owner_id, event_id)
        if existing is None:
            raise CalendarServiceError("Подію не знайдено.", 404)

        title = str(patch.get("title", existing["title"])).strip()[:220] or existing["title"]
        description = str(patch.get("description", existing["description"])).strip()[:2000]
        start_utc = parse_utc_iso(patch["start_at"]) if "start_at" in patch and patch["start_at"] else parse_utc_iso(existing["start_at"])
        end_utc = parse_utc_iso(patch["end_at"]) if "end_at" in patch and patch["end_at"] else parse_utc_iso(existing["end_at"])
        if end_utc <= start_utc:
            raise CalendarServiceError("Час завершення має бути пізніше за початок.", 400)

        status = str(patch.get("status", existing["status"])).strip() or existing["status"]
        if status not in {"planned", "done", "skipped", "busy", "free"}:
            status = existing["status"]

        time_changed = (
            to_utc_iso(start_utc) != existing["start_at"] or to_utc_iso(end_utc) != existing["end_at"]
        )
        cfg = self.get_settings(owner_id)
        if time_changed and not existing["all_day"] and not allow_conflict and cfg.get("avoid_conflicts", True):
            check = self.check_slot_conflicts(
                owner_id,
                start_utc,
                end_utc,
                settings=cfg,
                exclude_event_id=event_id,
                check_forbidden=True,
                check_existing=True,
                buffer_minutes=0,
            )
            if not check.allowed:
                raise CalendarConflictError(check.reason, check.conflicts)

        now = self._now_iso()
        with self._connect() as conn:
            conn.execute(
                """UPDATE calendar_events SET
                    title = ?, description = ?, start_at = ?, end_at = ?, status = ?, updated_at = ?
                WHERE event_key = ?""",
                (title, description, to_utc_iso(start_utc), to_utc_iso(end_utc), status, now, f"{owner_id}:{event_id}"),
            )
        return self.get_event(owner_id, event_id)  # type: ignore[return-value]

    def set_google_event_id(self, owner_id: str, event_id: str, google_event_id: Optional[str]) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE calendar_events SET google_event_id = ?, updated_at = ? WHERE event_key = ?",
                (google_event_id, self._now_iso(), f"{owner_id}:{event_id}"),
            )

    def delete_event(self, owner_id: str, event_id: str) -> Optional[Dict[str, Any]]:
        existing = self.get_event(owner_id, event_id)
        if existing is None:
            return None
        with self._connect() as conn:
            conn.execute("DELETE FROM calendar_events WHERE event_key = ?", (f"{owner_id}:{event_id}",))
            if existing["created_by"] == "moodle":
                conn.execute("""UPDATE calendar_deadline_reviews SET decision = 'removed'
                    WHERE owner_id = ? AND course_id = ? AND assignment_id = ?""",
                    (owner_id, existing["course_id"], existing["external_id"]))
        return existing

    def _row_to_source(self, row: sqlite3.Row) -> Dict[str, Any]:
        return {
            "source_id": row["source_id"],
            "provider": row["provider"],
            "title": row["title"],
            "calendar_ref": row["calendar_ref"],
            "sync_direction": row["sync_direction"],
            "enabled": bool(row["enabled"]),
            "last_synced_at": row["last_synced_at"],
            "last_error": row["last_error"],
            "updated_at": row["updated_at"],
        }

    def list_sources(self, owner_id: str) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM calendar_sources WHERE owner_id = ? ORDER BY updated_at DESC",
                (owner_id,),
            ).fetchall()
        return [self._row_to_source(r) for r in rows]

    def _get_source_row(self, owner_id: str, source_id: str) -> Optional[sqlite3.Row]:
        with self._connect() as conn:
            return conn.execute(
                "SELECT * FROM calendar_sources WHERE owner_id = ? AND source_id = ?",
                (owner_id, source_id),
            ).fetchone()

    def delete_source(self, owner_id: str, source_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM calendar_sources WHERE owner_id = ? AND source_id = ?", (owner_id, source_id))
            conn.execute("DELETE FROM calendar_events WHERE owner_id = ? AND source_id = ?", (owner_id, source_id))
        return cur.rowcount > 0

    def _upsert_synced_events(
        self,
        owner_id: str,
        source_id: str,
        source_type: str,
        events: List[Dict[str, Any]],
        window_start: datetime,
        window_end: datetime,
    ) -> int:
        now = self._now_iso()
        seen_ext: set[str] = set()
        with self._connect() as conn:
            conn.execute(
                """DELETE FROM calendar_events
                WHERE owner_id = ? AND source_id = ? AND end_at > ? AND start_at < ?""",
                (owner_id, source_id, to_utc_iso(window_start), to_utc_iso(window_end)),
            )
            for item in events:
                ext_id = str(item["external_id"])
                if ext_id in seen_ext:
                    continue
                seen_ext.add(ext_id)
                ev_id = f"sync-{uuid.uuid5(uuid.NAMESPACE_OID, f'{owner_id}:{source_id}:{ext_id}').hex[:14]}"
                conn.execute(
                    """INSERT OR REPLACE INTO calendar_events (
                        event_key, event_id, owner_id, source_id, external_id, source_type,
                        title, description, start_at, end_at, all_day, course_id, topic_index,
                        status, created_by, google_event_id, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, 'sync', ?, ?)""",
                    (
                        f"{owner_id}:{ev_id}",
                        ev_id,
                        owner_id,
                        source_id,
                        ext_id,
                        source_type,
                        item["title"],
                        item.get("description", ""),
                        item["start_at"],
                        item["end_at"],
                        int(bool(item.get("all_day", False))),
                        item.get("status", "busy"),
                        ext_id if source_type == "google" else None,
                        now,
                    ),
                )
            conn.execute(
                "UPDATE calendar_sources SET last_synced_at = ?, last_error = NULL, updated_at = ? WHERE owner_id = ? AND source_id = ?",
                (now, now, owner_id, source_id),
            )
        return len(seen_ext)

    async def add_ics_url_source(
        self,
        owner_id: str,
        title: str,
        raw_url: str,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> Dict[str, Any]:
        safe_url = _validate_ics_url(raw_url)
        clean_title = str(title or "Зовнішній iCal").strip()[:100] or "Зовнішній iCal"
        source_id = f"src-{uuid.uuid4().hex[:12]}"
        blob = self._encrypt_secret(owner_id, {"url": safe_url})
        now = self._now_iso()
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO calendar_sources (
                    source_id, owner_id, provider, title, calendar_ref, credentials_blob,
                    sync_direction, enabled, last_synced_at, last_error, updated_at
                ) VALUES (?, ?, 'ics_url', ?, ?, ?, 'read', 1, NULL, NULL, ?)""",
                (source_id, owner_id, clean_title, _mask_ics_url(safe_url), blob, now),
            )
        try:
            synced = await self.sync_ics_source(owner_id, source_id, http_client=http_client)
            return synced
        except Exception:
            self.delete_source(owner_id, source_id)
            raise

    def import_ics_text(self, owner_id: str, title: str, ics_text: str) -> Dict[str, Any]:
        if "BEGIN:VEVENT" not in ics_text.upper() and "BEGIN:VCALENDAR" not in ics_text.upper():
            raise CalendarServiceError("Файл не схожий на коректний календар формату .ics.", 400)
        cfg = self.get_settings(owner_id)
        local_tz = resolve_timezone(cfg["timezone"])
        now_utc = datetime.now(timezone.utc)
        win_start = now_utc - timedelta(days=30)
        win_end = now_utc + timedelta(days=90)
        parsed = parse_ics_events(ics_text, local_tz, win_start, win_end)
        source_id = f"src-{uuid.uuid4().hex[:12]}"
        clean_title = str(title or "Імпортований .ics").strip()[:100] or "Імпортований .ics"
        now = self._now_iso()
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO calendar_sources (
                    source_id, owner_id, provider, title, calendar_ref, credentials_blob,
                    sync_direction, enabled, last_synced_at, last_error, updated_at
                ) VALUES (?, ?, 'ics_file', ?, 'uploaded.ics', NULL, 'read', 1, ?, NULL, ?)""",
                (source_id, owner_id, clean_title, now, now),
            )
        count = self._upsert_synced_events(owner_id, source_id, "ics", parsed, win_start, win_end)
        row = self._get_source_row(owner_id, source_id)
        return {**self._row_to_source(row), "synced_events": count}

    async def sync_ics_source(
        self,
        owner_id: str,
        source_id: str,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> Dict[str, Any]:
        row = self._get_source_row(owner_id, source_id)
        if row is None or row["provider"] != "ics_url":
            raise CalendarServiceError("Джерело iCal не знайдено.", 404)
        creds = self._decrypt_secret(owner_id, row["credentials_blob"])
        safe_url = _validate_ics_url(creds.get("url", ""))
        try:
            if http_client is not None:
                resp = await http_client.get(safe_url, timeout=15.0)
            else:
                async with httpx.AsyncClient(timeout=15.0, follow_redirects=False) as client:
                    resp = await client.get(safe_url, headers={"User-Agent": "HustleCalendarSync/1.0"})
                    if resp.is_redirect and resp.headers.get("location"):
                        redir = _validate_ics_url(resp.headers["location"])
                        resp = await client.get(redir, headers={"User-Agent": "HustleCalendarSync/1.0"})
            if resp.status_code != 200:
                raise CalendarServiceError(f"Календар за URL відповів HTTP {resp.status_code}.", 502)
            body = resp.text
            if "BEGIN:VCALENDAR" not in body.upper():
                raise CalendarServiceError("Посилання не повернуло коректний iCalendar (.ics) потік.", 400)
        except CalendarServiceError as exc:
            self._mark_source_error(owner_id, source_id, exc.message)
            raise
        except Exception:
            msg = "Не вдалося завантажити зовнішній календар за посиланням."
            self._mark_source_error(owner_id, source_id, msg)
            raise CalendarServiceError(msg, 502) from None

        cfg = self.get_settings(owner_id)
        local_tz = resolve_timezone(cfg["timezone"])
        now_utc = datetime.now(timezone.utc)
        win_start = now_utc - timedelta(days=14)
        win_end = now_utc + timedelta(days=60)
        parsed = parse_ics_events(body, local_tz, win_start, win_end)
        count = self._upsert_synced_events(owner_id, source_id, "ics", parsed, win_start, win_end)
        fresh = self._get_source_row(owner_id, source_id)
        return {**self._row_to_source(fresh), "synced_events": count}

    def _mark_source_error(self, owner_id: str, source_id: str, error_msg: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE calendar_sources SET last_error = ?, updated_at = ? WHERE owner_id = ? AND source_id = ?",
                (error_msg[:300], self._now_iso(), owner_id, source_id),
            )

    def save_google_connection(
        self,
        owner_id: str,
        *,
        access_token: str,
        refresh_token: Optional[str],
        expires_in: int,
        email: str = "",
        calendar_id: str = "primary",
    ) -> Dict[str, Any]:
        with self._connect() as conn:
            existing = conn.execute(
                "SELECT source_id, credentials_blob FROM calendar_sources WHERE owner_id = ? AND provider = 'google' LIMIT 1",
                (owner_id,),
            ).fetchone()
            prev_refresh = None
            prev_selected = None
            if existing and existing["credentials_blob"]:
                try:
                    prev_creds = self._decrypt_secret(owner_id, existing["credentials_blob"])
                    prev_refresh = prev_creds.get("refresh_token")
                    prev_selected = prev_creds.get("selected_calendars")
                except CalendarServiceError:
                    prev_refresh = None
            merged_refresh = refresh_token or prev_refresh
            selected_calendars = prev_selected if isinstance(prev_selected, list) and prev_selected else [{"id": calendar_id, "summary": "Основний календар"}]
            cal_ref = ", ".join(str(c.get("summary") or c.get("id")) for c in selected_calendars[:3])[:120] or calendar_id
            expires_at = (datetime.now(timezone.utc) + timedelta(seconds=max(60, int(expires_in or 3600)) - 30)).isoformat()
            blob = self._encrypt_secret(
                owner_id,
                {
                    "access_token": access_token,
                    "refresh_token": merged_refresh,
                    "expires_at": expires_at,
                    "email": email,
                    "calendar_id": calendar_id,
                    "selected_calendars": selected_calendars,
                },
            )
            now = self._now_iso()
            title = f"Google Календар ({email})" if email else "Google Календар"
            if existing:
                source_id = existing["source_id"]
                conn.execute(
                    """UPDATE calendar_sources SET
                        title = ?, calendar_ref = ?, credentials_blob = ?,
                        sync_direction = 'two_way', enabled = 1, last_error = NULL, updated_at = ?
                    WHERE source_id = ?""",
                    (title, cal_ref, blob, now, source_id),
                )
            else:
                source_id = f"src-{uuid.uuid4().hex[:12]}"
                conn.execute(
                    """INSERT INTO calendar_sources (
                        source_id, owner_id, provider, title, calendar_ref, credentials_blob,
                        sync_direction, enabled, last_synced_at, last_error, updated_at
                    ) VALUES (?, ?, 'google', ?, ?, ?, 'two_way', 1, NULL, NULL, ?)""",
                    (source_id, owner_id, title, cal_ref, blob, now),
                )
        return self._row_to_source(self._get_source_row(owner_id, source_id))

    async def _get_google_token_and_source(
        self,
        owner_id: str,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> Optional[Tuple[str, str, str]]:
        """Return (source_id, access_token, calendar_id) refreshing when needed, or None."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM calendar_sources WHERE owner_id = ? AND provider = 'google' AND enabled = 1 LIMIT 1",
                (owner_id,),
            ).fetchone()
        if row is None or not row["credentials_blob"]:
            return None

        creds = self._decrypt_secret(owner_id, row["credentials_blob"])
        access_token = creds.get("access_token") or ""
        refresh_token = creds.get("refresh_token")
        calendar_id = creds.get("calendar_id") or "primary"
        expires_at = parse_utc_iso(creds["expires_at"]) if creds.get("expires_at") else datetime.now(timezone.utc)

        if access_token and expires_at > datetime.now(timezone.utc) + timedelta(seconds=30):
            return row["source_id"], access_token, calendar_id

        if not refresh_token:
            self._mark_source_error(owner_id, row["source_id"], "Токен Google Календаря завершився. Перепідключи Google Календар.")
            return None

        settings = get_settings()
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            return None

        try:
            if http_client is not None:
                tok = await http_client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "refresh_token": refresh_token,
                        "grant_type": "refresh_token",
                    },
                    timeout=15.0,
                )
            else:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    tok = await client.post(
                        "https://oauth2.googleapis.com/token",
                        data={
                            "client_id": settings.GOOGLE_CLIENT_ID,
                            "client_secret": settings.GOOGLE_CLIENT_SECRET,
                            "refresh_token": refresh_token,
                            "grant_type": "refresh_token",
                        },
                    )
            if tok.status_code != 200:
                self._mark_source_error(owner_id, row["source_id"], "Не вдалося оновити доступ до Google Календаря. Перепідключи його.")
                return None
            payload = tok.json()
            new_access = payload.get("access_token") or ""
            if not new_access:
                return None
            self.save_google_connection(
                owner_id,
                access_token=new_access,
                refresh_token=payload.get("refresh_token") or refresh_token,
                expires_in=int(payload.get("expires_in") or 3600),
                email=creds.get("email", ""),
                calendar_id=calendar_id,
            )
            return row["source_id"], new_access, calendar_id
        except Exception:
            self._mark_source_error(owner_id, row["source_id"], "Помилка оновлення токена Google Календаря.")
            return None

    @staticmethod
    def _format_google_http_error(resp: httpx.Response) -> str:
        detail = ""
        reason = ""
        try:
            err_obj = (resp.json() or {}).get("error") or {}
            detail = str(err_obj.get("message") or "").strip()[:180]
            errs = err_obj.get("errors") or []
            if errs and isinstance(errs[0], dict):
                reason = str(errs[0].get("reason") or "").strip()
        except Exception:
            pass
        if reason in {"insufficientPermissions", "forbidden"} or "insufficient" in detail.lower():
            return "Недостатньо прав для Google Календаря. Відключи джерело і підключи Google Календар повторно, підтвердивши доступ до календаря."
        if reason == "accessNotConfigured" or "has not been used" in detail.lower() or "is disabled" in detail.lower():
            return "Google Calendar API ще вимкнений або активується у GCP-проєкті. Зачекай хвилину й натисни ↻."
        return f"Google Календар повернув HTTP {resp.status_code}{f': {detail}' if detail else ''}."

    def _get_google_selected_calendars(self, owner_id: str) -> List[Dict[str, str]]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT credentials_blob FROM calendar_sources WHERE owner_id = ? AND provider = 'google' AND enabled = 1 LIMIT 1",
                (owner_id,),
            ).fetchone()
        if not row or not row["credentials_blob"]:
            return []
        creds = self._decrypt_secret(owner_id, row["credentials_blob"])
        selected = creds.get("selected_calendars")
        if isinstance(selected, list) and selected:
            return [{"id": str(c["id"]), "summary": str(c.get("summary") or c["id"])} for c in selected if c.get("id")]
        cid = str(creds.get("calendar_id") or "primary")
        return [{"id": cid, "summary": "Основний календар"}]

    def set_google_selected_calendars(self, owner_id: str, calendars: List[Dict[str, str]]) -> List[Dict[str, str]]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT source_id, credentials_blob FROM calendar_sources WHERE owner_id = ? AND provider = 'google' AND enabled = 1 LIMIT 1",
                (owner_id,),
            ).fetchone()
            if not row or not row["credentials_blob"]:
                raise CalendarServiceError("Google Календар не підключено.", 404)
            creds = self._decrypt_secret(owner_id, row["credentials_blob"])
            seen: set[str] = set()
            cleaned: List[Dict[str, str]] = []
            for item in calendars:
                cid = str(item.get("id") or "").strip()
                if not cid or cid in seen:
                    continue
                seen.add(cid)
                cleaned.append({"id": cid, "summary": str(item.get("summary") or cid).strip()[:120]})
            if not cleaned:
                raise CalendarServiceError("Обери хоча б один календар для синхронізації.", 400)
            creds["selected_calendars"] = cleaned
            blob = self._encrypt_secret(owner_id, creds)
            cal_ref = ", ".join(c["summary"] for c in cleaned[:3])
            if len(cleaned) > 3:
                cal_ref += f" (+{len(cleaned) - 3})"
            conn.execute(
                "UPDATE calendar_sources SET credentials_blob = ?, calendar_ref = ?, updated_at = ? WHERE source_id = ?",
                (blob, cal_ref[:120], self._now_iso(), row["source_id"]),
            )
            return cleaned

    async def list_google_calendars(
        self,
        owner_id: str,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> List[Dict[str, Any]]:
        resolved = await self._get_google_token_and_source(owner_id, http_client=http_client)
        if resolved is None:
            raise CalendarServiceError("Google Календар не підключено.", 404)
        source_id, access_token, _ = resolved
        selected_ids = {c["id"] for c in self._get_google_selected_calendars(owner_id)}
        url = "https://www.googleapis.com/calendar/v3/users/me/calendarList"
        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            if http_client is not None:
                resp = await http_client.get(url, params={"minAccessRole": "reader"}, headers=headers, timeout=15.0)
            else:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.get(url, params={"minAccessRole": "reader"}, headers=headers)
            if resp.status_code != 200:
                msg = self._format_google_http_error(resp)
                self._mark_source_error(owner_id, source_id, msg)
                raise CalendarServiceError(msg, 502)
            items = resp.json().get("items", [])
        except CalendarServiceError:
            raise
        except Exception:
            raise CalendarServiceError("Не вдалося отримати список календарів Google.", 502) from None

        out: List[Dict[str, Any]] = []
        for item in items:
            cid = str(item.get("id") or "").strip()
            if not cid:
                continue
            is_primary = bool(item.get("primary"))
            out.append({
                "id": cid,
                "summary": str(item.get("summaryOverride") or item.get("summary") or cid)[:120],
                "primary": is_primary,
                "access_role": str(item.get("accessRole") or ""),
                "selected": cid in selected_ids or (is_primary and "primary" in selected_ids),
            })
        out.sort(key=lambda c: (not c["primary"], c["summary"].lower()))
        return out

    async def sync_google_source(
        self,
        owner_id: str,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> Optional[Dict[str, Any]]:
        resolved = await self._get_google_token_and_source(owner_id, http_client=http_client)
        if resolved is None:
            return None
        source_id, access_token, _ = resolved
        selected_cals = self._get_google_selected_calendars(owner_id)
        cfg = self.get_settings(owner_id)
        local_tz = resolve_timezone(cfg["timezone"])
        now_utc = datetime.now(timezone.utc)
        win_start = now_utc - timedelta(days=7)
        win_end = now_utc + timedelta(days=45)

        with self._connect() as conn:
            pushed_ids = {
                r["google_event_id"]
                for r in conn.execute(
                    "SELECT google_event_id FROM calendar_events WHERE owner_id = ? AND source_id IS NULL AND google_event_id IS NOT NULL",
                    (owner_id,),
                ).fetchall()
            }

        params = {
            "singleEvents": "true",
            "orderBy": "startTime",
            "timeMin": to_utc_iso(win_start),
            "timeMax": to_utc_iso(win_end),
            "maxResults": "250",
        }
        headers = {"Authorization": f"Bearer {access_token}"}
        parsed: List[Dict[str, Any]] = []

        for cal in selected_cals:
            cal_id = cal["id"]
            cal_label = cal.get("summary") or ""
            url = f"https://www.googleapis.com/calendar/v3/calendars/{quote(cal_id, safe='')}/events"
            try:
                if http_client is not None:
                    resp = await http_client.get(url, params=params, headers=headers, timeout=15.0)
                else:
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        resp = await client.get(url, params=params, headers=headers)
                if resp.status_code != 200:
                    msg = self._format_google_http_error(resp)
                    self._mark_source_error(owner_id, source_id, msg)
                    raise CalendarServiceError(msg, 502)
                items = resp.json().get("items", [])
            except CalendarServiceError:
                raise
            except Exception:
                msg = "Не вдалося синхронізувати Google Календар."
                self._mark_source_error(owner_id, source_id, msg)
                raise CalendarServiceError(msg, 502) from None

            for item in items:
                if item.get("status") == "cancelled":
                    continue
                raw_id = str(item.get("id") or "")
                if not raw_id or raw_id in pushed_ids:
                    continue
                priv = (item.get("extendedProperties") or {}).get("private") or {}
                if priv.get("hustleEventId"):
                    continue
                start_obj = item.get("start") or {}
                end_obj = item.get("end") or {}
                all_day = "date" in start_obj and "dateTime" not in start_obj
                try:
                    if all_day:
                        sd = datetime.strptime(start_obj["date"], "%Y-%m-%d").date()
                        ed = datetime.strptime(end_obj.get("date") or start_obj["date"], "%Y-%m-%d").date()
                        s_utc = datetime.combine(sd, time(0, 0), tzinfo=local_tz).astimezone(timezone.utc)
                        e_utc = datetime.combine(ed, time(0, 0), tzinfo=local_tz).astimezone(timezone.utc)
                    else:
                        s_utc = parse_utc_iso(start_obj["dateTime"])
                        e_utc = parse_utc_iso(end_obj["dateTime"])
                except Exception:
                    continue
                if e_utc <= s_utc:
                    continue
                desc = str(item.get("description") or "").strip()
                if cal_id != "primary" and cal_label and cal_label not in desc:
                    desc = f"{cal_label}\n{desc}".strip()
                parsed.append({
                    "external_id": f"{cal_id}::{raw_id}" if cal_id != "primary" else raw_id,
                    "title": str(item.get("summary") or "Подія Google")[:220],
                    "description": desc[:2000],
                    "start_at": to_utc_iso(s_utc),
                    "end_at": to_utc_iso(e_utc),
                    "all_day": all_day,
                    "status": "free" if item.get("transparency") == "transparent" else "busy",
                })

        count = self._upsert_synced_events(owner_id, source_id, "google", parsed, win_start, win_end)
        fresh = self._get_source_row(owner_id, source_id)
        return {**self._row_to_source(fresh), "synced_events": count}

    async def push_event_to_google(
        self,
        owner_id: str,
        event: Dict[str, Any],
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> Optional[str]:
        """Mirror a local/AI study event into Google Calendar if connected."""
        resolved = await self._get_google_token_and_source(owner_id, http_client=http_client)
        if resolved is None:
            return None
        _, access_token, calendar_id = resolved
        cfg = self.get_settings(owner_id)
        body = {
            "summary": event["title"],
            "description": event.get("description") or "Заплановано в Hustle",
            "start": {"dateTime": event["start_at"], "timeZone": cfg["timezone"]},
            "end": {"dateTime": event["end_at"], "timeZone": cfg["timezone"]},
            "extendedProperties": {"private": {"hustleEventId": event["event_id"]}},
        }
        headers = {"Authorization": f"Bearer {access_token}"}
        existing_gid = event.get("google_event_id")
        try:
            if http_client is not None:
                if existing_gid:
                    resp = await http_client.patch(
                        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{existing_gid}",
                        json=body, headers=headers, timeout=15.0,
                    )
                else:
                    resp = await http_client.post(
                        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events",
                        json=body, headers=headers, timeout=15.0,
                    )
            else:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    if existing_gid:
                        resp = await client.patch(
                            f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{existing_gid}",
                            json=body, headers=headers,
                        )
                    else:
                        resp = await client.post(
                            f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events",
                            json=body, headers=headers,
                        )
            if resp.status_code in {200, 201}:
                gid = resp.json().get("id")
                if gid:
                    self.set_google_event_id(owner_id, event["event_id"], gid)
                return gid
        except Exception as exc:
            logger.warning("Failed pushing event %s to Google Calendar (%s)", event.get("event_id"), type(exc).__name__)
        return None

    async def delete_event_from_google(
        self,
        owner_id: str,
        google_event_id: Optional[str],
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        if not google_event_id:
            return
        resolved = await self._get_google_token_and_source(owner_id, http_client=http_client)
        if resolved is None:
            return
        _, access_token, calendar_id = resolved
        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{google_event_id}"
        try:
            if http_client is not None:
                await http_client.delete(url, headers=headers, timeout=15.0)
            else:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    await client.delete(url, headers=headers)
        except Exception:
            pass

    async def sync_all_sources(self, owner_id: str) -> Dict[str, Any]:
        sources = self.list_sources(owner_id)
        synced = []
        warnings: List[str] = []
        for src in sources:
            if not src.get("enabled", True):
                continue
            try:
                if src["provider"] == "google":
                    res = await self.sync_google_source(owner_id)
                    if res:
                        synced.append(res)
                elif src["provider"] == "ics_url":
                    synced.append(await self.sync_ics_source(owner_id, src["source_id"]))
            except CalendarServiceError as exc:
                warnings.append(f"{src['title']}: {exc.message}")
        return {"synced": synced, "warnings": warnings}

    def export_ics(
        self,
        owner_id: str,
        deadlines: Optional[List[Dict[str, Any]]] = None,
        include_external: bool = False,
    ) -> str:
        """Render the owner's study blocks, manual events, and optional Moodle deadlines as RFC 5545 .ics."""
        events = self.list_events(owner_id)
        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Hustle Study Space//Calendar//UK",
            "CALSCALE:GREGORIAN",
            "X-WR-CALNAME:Hustle — Навчання",
        ]
        for ev in events:
            if not include_external and ev["source_type"] in {"google", "ics"}:
                continue
            if ev["status"] == "skipped":
                continue
            s_dt = parse_utc_iso(ev["start_at"]).strftime("%Y%m%dT%H%M%SZ")
            e_dt = parse_utc_iso(ev["end_at"]).strftime("%Y%m%dT%H%M%SZ")
            lines.extend([
                "BEGIN:VEVENT",
                f"UID:{ev['event_id']}@hustle.local",
                f"DTSTAMP:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
                f"DTSTART:{s_dt}",
                f"DTEND:{e_dt}",
                f"SUMMARY:{_escape_ics_text(ev['title'])}",
                f"DESCRIPTION:{_escape_ics_text(ev.get('description') or '')}",
                "END:VEVENT",
            ])
        for dl in deadlines or []:
            due = int(dl.get("duedate") or 0)
            if due <= 0:
                continue
            due_dt = datetime.fromtimestamp(due, tz=timezone.utc)
            s_dt = (due_dt - timedelta(minutes=30)).strftime("%Y%m%dT%H%M%SZ")
            e_dt = due_dt.strftime("%Y%m%dT%H%M%SZ")
            title = f"Дедлайн: {dl.get('name', 'Завдання')}"
            desc = dl.get("course_name", "")
            lines.extend([
                "BEGIN:VEVENT",
                f"UID:moodle-dl-{dl.get('course_id', 0)}-{dl.get('id', 0)}@hustle.local",
                f"DTSTAMP:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
                f"DTSTART:{s_dt}",
                f"DTEND:{e_dt}",
                f"SUMMARY:{_escape_ics_text(title)}",
                f"DESCRIPTION:{_escape_ics_text(desc)}",
                "END:VEVENT",
            ])
        lines.append("END:VCALENDAR")
        return "\r\n".join(lines) + "\r\n"


_calendar_store: Optional[CalendarStore] = None


def get_calendar_store() -> CalendarStore:
    global _calendar_store
    if _calendar_store is None:
        _calendar_store = CalendarStore()
    return _calendar_store
