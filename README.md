# Hustle — Moodle LMS Study Workspace & Smart Calendar

**Hustle** is an AI-assisted study workspace and Moodle LMS connector built for university students. It connects to a student's Moodle instance (via a browser extension or direct session pairing without storing Moodle passwords), organizes course materials by topic, generates study summaries (with local LaTeX/MathML math rendering), flashcards, self-check quizzes, and oral-defense practice, extracts notes from YouTube lectures, and syncs a smart study calendar with Google Calendar / iCalendar (`.ics`) while respecting sleep and forbidden hours.

---

## Repository Structure

```text
.
├── backend/                  # FastAPI API, Moodle client, Gemini/Vertex AI, scheduler & tests
│   ├── app/
│   │   ├── config.py         # Pydantic settings (.env)
│   │   ├── main.py           # FastAPI app, routers & frontend static mounts
│   │   ├── core/             # Auth, JWT/Fernet security, exceptions, university presets
│   │   ├── models/           # Request/response & TopicMix Pydantic models
│   │   ├── routers/          # REST endpoints (auth, courses, assignments, grades, learning, calendar, workspace)
│   │   └── services/         # Workspace SQLite store, Moodle client, Gemini/YouTube, calendar sync & scheduler
│   ├── tests/                # Python (pytest) & JavaScript (node --test) test suites
│   ├── pytest.ini
│   ├── requirements.txt
│   └── run.py                # Uvicorn entry point
├── frontend/                 # Web UIs, browser extension & static assets
│   ├── hustle/               # Main Hustle web workspace (/hustle/)
│   ├── prototype/            # Paper-style dashboard & connected calendar UI (/prototype/)
│   ├── static/               # Legacy portal JS assets (/static/)
│   ├── templates/            # Jinja2 HTML templates
│   ├── extension/            # Chrome/Edge extension for passwordless Moodle pairing
│   ├── tools/                # Local UI QA utilities
│   └── legacy-midterm/       # Archived standalone Midterm study microsite scripts/assets
├── infra/                    # Containerization & reverse-proxy deployment config
│   ├── Dockerfile            # Production Python 3.12 image (built from repo root)
│   ├── docker-compose.yml    # Single-container service + ./data volume mount
│   ├── Caddyfile             # HTTPS reverse proxy config for production
│   └── deploy_aws.sh         # Legacy AWS helper script
├── .github/workflows/ci-cd.yml
├── .env.example
└── README.md
```

---

## Prerequisites

- **Python 3.12+**
- **Node.js 20+** (for JS syntax checks & `node --test` suite)
- **Docker & Docker Compose** (for containerized local run or production deployment)
- Optional integrations:
  - **Gemini API key** (user-supplied in Settings, or `GEMINI_API_KEY` / `VERTEX_AI_PROJECT` on the server)
  - **Google OAuth** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`) for Google Sign-In and two-way Google Calendar sync

---

## Run Locally

### Option 1: Python virtual environment

1. **Create a `.env` file** from the template and set a strong `SECRET_KEY`:
   ```bash
   cp .env.example .env
   ```
   Useful local variables:
   - `SECRET_KEY` — 32+ char random string for signing session JWTs
   - `MOODLE_BASE_URL` — default Moodle URL (e.g. `https://learn.ucu.edu.ua`)
   - `MOODLE_MOCK_MODE=false` — set `true` only if testing without a live Moodle instance
   - `GEMINI_API_KEY` or `VERTEX_AI_PROJECT` — optional server default AI provider (users can also enter their own Gemini API key in `#settings`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — optional Google OAuth & Google Calendar sync

2. **Install backend dependencies & start the server** (from repo root):
   ```bash
   python -m venv .venv
   # Windows: .venv\Scripts\activate
   # Linux/macOS: source .venv/bin/activate
   pip install -r backend/requirements.txt
   python backend/run.py
   ```
   Open `http://127.0.0.1:8000/hustle/` (or `http://127.0.0.1:8000/prototype/`).

### Option 2: Docker Compose

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d --build
```
Check health: `curl http://127.0.0.1:8000/healthz` -> `{"status":"ok"}`.

---

## Run Tests

From the repository root:

```bash
# JavaScript unit tests
node --test backend/tests/*.test.cjs

# Python test suite (non-mock mode)
cd backend
pytest --ignore=tests/test_material_clustering_and_video_transcription.py -v

# Mock-mode clustering & video transcription tests
MOODLE_MOCK_MODE=true pytest tests/test_material_clustering_and_video_transcription.py -v
```

---

## Deploy to Production

The repository includes an automated pipeline in `.github/workflows/ci-cd.yml` plus Docker & Caddy configs in `infra/`:

1. **VM setup (Ubuntu / Debian):**
   - Install Docker, Docker Compose plugin, and Caddy.
   - Clone or sync the repository to `~/cms_obgortka`, create `~/cms_obgortka/.env` with production values (`COOKIE_SECURE=true`, `HUSTLE_PUBLIC_ORIGIN=https://your-domain`, `GOOGLE_REDIRECT_URI=https://your-domain/api/auth/google/callback`, etc.), and ensure `data/` is writable by container UID `1000`.
   - Start the service:
     ```bash
     docker compose -f infra/docker-compose.yml up -d --build
     ```
   - Point Caddy at `infra/Caddyfile` (updates domain & proxies HTTPS traffic to `127.0.0.1:8000`).

2. **GitHub Actions CI/CD:**
   - Configure repository secrets `GCP_VM_HOST`, `GCP_VM_USER`, and `GCP_VM_SSH_KEY`.
   - Pushes to `main` run JS + Python tests, verify `docker build -f infra/Dockerfile .`, sync code to the VM (preserving `.env` and `data/`), rebuild the container, reload `infra/Caddyfile` if changed, and verify `/healthz`.
