from abc import ABC, abstractmethod
import os
import re
import shutil
from typing import Optional

from app.config import get_settings
from app.core.security import owner_storage_slug

ALLOWED_STAGING_EXTENSIONS = {
    ".pdf",
    ".pptx",
    ".docx",
    ".html",
    ".htm",
    ".txt",
    ".md",
    ".csv",
    ".json",
}


def is_allowed_staging_filename(filename: str) -> bool:
    """Allow only supported study document extensions before staging or downloading."""
    lower = (filename or "").lower().strip()
    _, ext = os.path.splitext(lower)
    if not ext:
        return True
    return ext in ALLOWED_STAGING_EXTENSIONS


def sanitize_filename(filename: str) -> str:
    """Strip paths and unsafe characters from a staged filename."""
    base = os.path.basename((filename or "material.bin").replace("\\", "/")).strip()
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    if not cleaned or cleaned in (".", ".."):
        cleaned = "material.bin"
    return cleaned[:96]


def build_isolated_storage_key(
    owner_id: str,
    course_id: int,
    module_id: int,
    file_sha256: str,
    filename: str,
) -> str:
    """
    Build a strictly per-person isolated object key:
      <sha256(owner_id)[:16]>/<course_id>/<module_id>_<file_sha256[:12]>_<safe_name>
    """
    slug = owner_storage_slug(owner_id)
    safe_name = sanitize_filename(filename)
    hash_prefix = (file_sha256 or "")[:12] or "000000000000"
    return f"{slug}/{int(course_id)}/{int(module_id)}_{hash_prefix}_{safe_name}"


class TempStorageBackend(ABC):
    """
    Abstract per-person temporary object storage (ОБД) for validation & processing.
    Supports isolated local directories out of the box and optional S3 storage.
    """

    backend_name: str = "abstract"

    @staticmethod
    def verify_key_ownership(owner_id: str, storage_key: str) -> bool:
        expected_prefix = f"{owner_storage_slug(owner_id)}/"
        return isinstance(storage_key, str) and storage_key.startswith(expected_prefix)

    @abstractmethod
    def put_bytes(
        self,
        storage_key: str,
        raw_bytes: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Persist raw bytes under the isolated per-person key."""

    @abstractmethod
    def get_bytes(self, storage_key: str) -> Optional[bytes]:
        """Read staged bytes for validation/parsing."""

    @abstractmethod
    def delete_bytes(self, storage_key: str) -> bool:
        """Delete staged bytes immediately after processing or TTL expiry."""

    @abstractmethod
    def delete_prefix(self, owner_id: str, course_id: Optional[int] = None) -> int:
        """Delete all staged objects for one user (or one user+course) via single folder/prefix delete."""

    @abstractmethod
    def exists(self, storage_key: str) -> bool:
        """Check if staged bytes currently exist."""


class LocalIsolatedTempStorage(TempStorageBackend):
    """Stores temporary files in strictly isolated per-owner/per-course subdirectories on disk."""

    backend_name = "local"

    def __init__(self, base_dir: str):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def _resolve_safe_path(self, storage_key: str) -> str:
        norm_rel = os.path.normpath(storage_key.replace("\\", "/"))
        if os.path.isabs(norm_rel) or norm_rel.startswith(".."):
            raise ValueError("Unsafe temporary storage key")
        target = os.path.abspath(os.path.join(self.base_dir, norm_rel))
        if os.path.commonpath([self.base_dir, target]) != self.base_dir or target == self.base_dir:
            raise ValueError("Storage key escapes isolated staging root")
        return target

    def put_bytes(
        self,
        storage_key: str,
        raw_bytes: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        path = self._resolve_safe_path(storage_key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(raw_bytes)
        return storage_key

    def get_bytes(self, storage_key: str) -> Optional[bytes]:
        path = self._resolve_safe_path(storage_key)
        if not os.path.isfile(path):
            return None
        with open(path, "rb") as fh:
            return fh.read()

    def delete_bytes(self, storage_key: str) -> bool:
        path = self._resolve_safe_path(storage_key)
        if not os.path.isfile(path):
            return False
        os.remove(path)
        parent = os.path.dirname(path)
        while parent != self.base_dir and os.path.commonpath([self.base_dir, parent]) == self.base_dir:
            try:
                if os.path.isdir(parent) and not os.listdir(parent):
                    os.rmdir(parent)
                    parent = os.path.dirname(parent)
                else:
                    break
            except OSError:
                break
        return True

    def delete_prefix(self, owner_id: str, course_id: Optional[int] = None) -> int:
        slug = owner_storage_slug(owner_id)
        rel = f"{slug}/{int(course_id)}" if course_id is not None else slug
        target_dir = self._resolve_safe_path(rel)
        if not os.path.isdir(target_dir):
            return 0
        count = sum(len(files) for _, _, files in os.walk(target_dir))
        shutil.rmtree(target_dir, ignore_errors=True)
        if course_id is not None:
            owner_dir = self._resolve_safe_path(slug)
            try:
                if os.path.isdir(owner_dir) and not os.listdir(owner_dir):
                    os.rmdir(owner_dir)
            except OSError:
                pass
        return count

    def exists(self, storage_key: str) -> bool:
        path = self._resolve_safe_path(storage_key)
        return os.path.isfile(path)


class S3TempStorage(TempStorageBackend):
    """Optional S3-backed temporary staging storage with per-person key prefixes and SSE-S3."""

    backend_name = "s3"

    def __init__(self, bucket: str, region: str = "eu-central-1", prefix: str = "staging"):
        try:
            import boto3  # type: ignore
        except ImportError as exc:
            raise RuntimeError("boto3 is required when S3_BUCKET is configured") from exc

        self.bucket = bucket
        self.region = region
        self.prefix = prefix.strip("/")
        self.client = boto3.client("s3", region_name=region)

    def _s3_key(self, storage_key: str) -> str:
        clean = storage_key.lstrip("/")
        return f"{self.prefix}/{clean}" if self.prefix else clean

    def put_bytes(
        self,
        storage_key: str,
        raw_bytes: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        self.client.put_object(
            Bucket=self.bucket,
            Key=self._s3_key(storage_key),
            Body=raw_bytes,
            ContentType=content_type or "application/octet-stream",
            ServerSideEncryption="AES256",
        )
        return storage_key

    def get_bytes(self, storage_key: str) -> Optional[bytes]:
        try:
            resp = self.client.get_object(Bucket=self.bucket, Key=self._s3_key(storage_key))
            return resp["Body"].read()
        except Exception:
            return None

    def delete_bytes(self, storage_key: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=self._s3_key(storage_key))
            return True
        except Exception:
            return False

    def delete_prefix(self, owner_id: str, course_id: Optional[int] = None) -> int:
        slug = owner_storage_slug(owner_id)
        rel = f"{slug}/{int(course_id)}/" if course_id is not None else f"{slug}/"
        full_prefix = self._s3_key(rel)
        deleted = 0
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix=full_prefix):
            objs = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
            if objs:
                self.client.delete_objects(Bucket=self.bucket, Delete={"Objects": objs})
                deleted += len(objs)
        return deleted

    def exists(self, storage_key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=self._s3_key(storage_key))
            return True
        except Exception:
            return False


_temp_storage_instance: Optional[TempStorageBackend] = None
_temp_storage_sig: Optional[tuple] = None


def get_temp_storage() -> TempStorageBackend:
    """Return configured temporary storage backend (S3 if S3_BUCKET set, else isolated local dir)."""
    global _temp_storage_instance, _temp_storage_sig
    settings = get_settings()
    sig = (settings.S3_BUCKET, settings.S3_REGION, settings.S3_PREFIX, settings.TEMP_STORAGE_DIR)
    if _temp_storage_instance is None or _temp_storage_sig != sig:
        if settings.S3_BUCKET.strip():
            _temp_storage_instance = S3TempStorage(
                bucket=settings.S3_BUCKET.strip(),
                region=settings.S3_REGION,
                prefix=settings.S3_PREFIX,
            )
        else:
            _temp_storage_instance = LocalIsolatedTempStorage(settings.TEMP_STORAGE_DIR)
        _temp_storage_sig = sig
    return _temp_storage_instance
