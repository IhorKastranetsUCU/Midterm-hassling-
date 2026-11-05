import os
import sys
import uvicorn

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "false").lower() in ("true", "1", "yes")
    print(f"Starting Moodle Connector server at http://{host}:{port} ...")
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)
