"""Download only the public extension files, never server config or credentials."""
import io
import json
from pathlib import Path
from urllib.parse import urlparse
from zipfile import ZipFile, ZIP_DEFLATED

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.config import get_settings

router = APIRouter(prefix="/api/hustle", tags=["Hustle extension"])
EXTENSION_DIR = Path(__file__).resolve().parents[2] / "extension"
PUBLIC_FILES = (
    "background.js", "extractor.js", "content.js", "popup.js", "popup.html",
    "hustle-bridge.js", "hustle-bridge-worker.js", "hustle-popup.css",
)
LOCAL_ORIGINS = ["http://127.0.0.1:8000", "http://localhost:8000"]


def public_origin():
    value = get_settings().HUSTLE_PUBLIC_ORIGIN.rstrip("/")
    parsed = urlparse(value)
    if (parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path
        or not parsed.hostname or (parsed.scheme != "https" and not
            (parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1")))):
        raise HTTPException(503, "HUSTLE_PUBLIC_ORIGIN must be an HTTPS origin or a local development origin.")
    return value


def package_manifest():
    manifest = json.loads((EXTENSION_DIR / "manifest.json").read_text())
    origins = list(dict.fromkeys([public_origin(), *LOCAL_ORIGINS]))
    for origin in origins:
        if origin + "/*" not in manifest["host_permissions"]:
            manifest["host_permissions"].append(origin + "/*")
    bridge = next(item for item in manifest["content_scripts"] if "hustle-bridge.js" in item["js"])
    bridge["matches"] = [origin + "/hustle/*" for origin in origins]
    return manifest, origins


@router.get("/extension")
def extension_info():
    manifest, origins = package_manifest()
    store = get_settings().HUSTLE_EXTENSION_STORE_URL
    parsed = urlparse(store)
    if store and (parsed.scheme != "https" or parsed.netloc != "chromewebstore.google.com" or not parsed.path.startswith("/detail/")):
        raise HTTPException(503, "Invalid Chrome Web Store listing URL.")
    moodle = [pattern.removesuffix("/*") for pattern in manifest["content_scripts"][0]["matches"]]
    return {"version": manifest["version"], "download_url": "/api/hustle/extension.zip",
            "store_url": store or None, "portal_origins": origins, "moodle_origins": moodle}


@router.get("/extension.zip")
def download_extension():
    manifest, origins = package_manifest()
    buffer = io.BytesIO()
    with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
        archive.writestr("Hustle/manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        config = {"portalOrigins": origins, "defaultPortal": public_origin()}
        archive.writestr("Hustle/hustle-config.js", "globalThis.HUSTLE_CONFIG = " + json.dumps(config) + ";\n")
        for name in PUBLIC_FILES:
            archive.writestr("Hustle/" + name, (EXTENSION_DIR / name).read_bytes())
        archive.writestr("Hustle/INSTALL.txt", "Розпакуй ZIP. Відкрий chrome://extensions, увімкни Режим розробника → Завантажити розпаковане → вибери папку Hustle. Повернись на сайт і онови сторінку.\n")
    return Response(buffer.getvalue(), media_type="application/zip", headers={
        "Content-Disposition": 'attachment; filename="Hustle-extension.zip"',
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    })
