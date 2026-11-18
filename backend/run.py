import os
import sys
from pathlib import Path
import uvicorn

BACKEND_DIR = str(Path(__file__).resolve().parent)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "false").lower() in ("true", "1", "yes")
    forwarded_allow_ips = os.getenv("FORWARDED_ALLOW_IPS", "127.0.0.1")
    print(f"Starting Hustle / Moodle Connector server at http://{host}:{port} ...")
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        proxy_headers=True,
        forwarded_allow_ips=forwarded_allow_ips,
    )
