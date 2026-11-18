"""Private Gemini credentials and an explicit, request-local generation context."""
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from functools import wraps
import inspect
import json
import os
from pathlib import Path
import re
import sqlite3

from cryptography.fernet import Fernet, InvalidToken
import httpx

from app.config import get_settings


class LearningProviderError(Exception):
    def __init__(self, message, status_code=502):
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class LearningProvider:
    api_key: str = field(repr=False)
    model: str = ""
    source: str = "personal"
    strict: bool = True


current_provider = ContextVar("learning_provider", default=None)


class LearningSettingsStore:
    def __init__(self, db_path):
        self.db_path = str(db_path)
        self.key_path = Path(db_path).absolute().parent / ".hustle-ai.key"
        with self._connect() as conn:
            conn.execute("""CREATE TABLE IF NOT EXISTS learning_provider_settings (
                owner_id TEXT PRIMARY KEY, credential BLOB NOT NULL,
                model TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )""")

    def _connect(self):
        return sqlite3.connect(self.db_path, timeout=5)

    def _cipher(self, create=False):
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
            raise LearningProviderError("Не вдалося відкрити захищене сховище ключів.") from None

    def get(self, owner_id):
        with self._connect() as conn:
            row = conn.execute("SELECT credential, model FROM learning_provider_settings WHERE owner_id = ?", (owner_id,)).fetchone()
        if row:
            try:
                data = json.loads(self._cipher().decrypt(row[0]))
                if data["owner_id"] != owner_id:
                    raise ValueError("Credential owner mismatch")
                return LearningProvider(data["api_key"], row[1])
            except (InvalidToken, KeyError, ValueError):
                raise LearningProviderError("Не вдалося прочитати ключ. Підключи Gemini повторно.") from None
        settings = get_settings()
        if (settings.VERTEX_AI_PROJECT or "").strip():
            return LearningProvider("", settings.GEMINI_MODEL or "gemini-3-flash-preview", "vertex", strict=True)
        if settings.GEMINI_API_KEY:
            return LearningProvider(settings.GEMINI_API_KEY, settings.GEMINI_MODEL, "server")
        return None

    def save(self, owner_id, api_key, model):
        encrypted = self._cipher(create=True).encrypt(json.dumps({"owner_id": owner_id, "api_key": api_key}).encode())
        with self._connect() as conn:
            conn.execute("""INSERT INTO learning_provider_settings(owner_id, credential, model) VALUES (?, ?, ?)
                ON CONFLICT(owner_id) DO UPDATE SET credential=excluded.credential,
                model=excluded.model, updated_at=CURRENT_TIMESTAMP""", (owner_id, encrypted, model))

    def status(self, owner_id):
        provider = self.get(owner_id)
        return {"configured": provider is not None, "provider": "gemini",
                "model": provider.model if provider else None,
                "source": provider.source if provider else None}


def provider_http_error(status, source: str = "personal", detail: str = ""):
    if status == 400:
        msg = "Gemini відхилив запит для цього матеріалу (некоректний формат або обмеження контенту)."
        if detail:
            msg = f"{msg} ({detail})"
        return LearningProviderError(msg, 400)
    if status in {401, 403}:
        if source == "vertex":
            return LearningProviderError("Помилка доступу до Vertex AI на сервері. Перевір дозволи або квоту проєкту.", 502)
        return LearningProviderError("Gemini відхилив ключ. Перевір ключ і доступ до API.", 400)
    if status == 429:
        return LearningProviderError("Ліміт Gemini вичерпано. Перевір квоту або спробуй пізніше.", 429)
    if status == 404:
        return LearningProviderError("Ця модель Gemini недоступна. Підключи ключ повторно для вибору доступної моделі.")
    return LearningProviderError("Gemini зараз не відповідає. Спробуй ще раз.")


async def validate_gemini_key(api_key):
    """Validate only against Google's model catalogue; do not generate paid content."""
    if not 16 <= len(api_key) <= 512 or any(char.isspace() for char in api_key):
        raise LearningProviderError("Встав повний Gemini API key.", 400)
    models, page_token = [], None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            for _ in range(10):
                params = {"pageSize": 100}
                if page_token:
                    params["pageToken"] = page_token
                response = await client.get("https://generativelanguage.googleapis.com/v1beta/models",
                                            headers={"x-goog-api-key": api_key}, params=params)
                if response.status_code != 200:
                    raise provider_http_error(response.status_code)
                payload = response.json()
                models.extend(payload.get("models", []))
                page_token = payload.get("nextPageToken")
                if not page_token:
                    break
    except (httpx.HTTPError, ValueError):
        raise LearningProviderError("Не вдалося перевірити Gemini. Перевір з’єднання і спробуй ще раз.") from None
    candidates = []
    for model in models:
        name = model.get("name", "").removeprefix("models/")
        if (re.fullmatch(r"gemini-[\w.-]+", name) and "generateContent" in model.get("supportedGenerationMethods", [])
                and not re.search(r"image|tts|audio|live|robot|computer|embedding|omni", name)):
            candidates.append(name)
    def rank(name):
        version = re.search(r"gemini-(\d+)(?:\.(\d+))?", name)
        numbers = tuple(int(value or 0) for value in version.groups()) if version else (0, 0)
        return (not bool(re.search(r"preview|exp|experimental", name)), "flash" in name, numbers, "lite" not in name, name)
    if not candidates:
        raise LearningProviderError("Для цього ключа немає доступної текстової моделі Gemini.", 400)
    return max(candidates, key=rank)


@contextmanager
def learning_provider_scope(provider):
    token = current_provider.set(provider)
    try:
        yield
    finally:
        current_provider.reset(token)


def with_learning_provider(method):
    """Resolve the owner's key for foreground and queued workspace generation alike."""
    signature = inspect.signature(method)
    @wraps(method)
    async def wrapped(self, *args, **kwargs):
        owner = signature.bind(self, *args, **kwargs).arguments["owner_id"]
        provider = LearningSettingsStore(self.db_path).get(owner)
        with learning_provider_scope(provider):
            return await method(self, *args, **kwargs)
    return wrapped
