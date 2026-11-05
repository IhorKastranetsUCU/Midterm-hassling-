# 🎓 Universal Moodle LMS Connector & Event Portal (Python + FastAPI)

A secure, high-performance, **event-driven** web connector and modern dashboard that interfaces with **any Moodle LMS installation** (UCU, other universities, or self-hosted Moodle 3.x/4.x/5.x).

---

## ✨ Features

- **🌐 Universal Moodle Compatibility**:
  - Connects to **any Moodle instance** on the web (e.g., `learn.ucu.edu.ua`, `moodle.your-university.edu`, etc.).
  - Works with active MoodleSession cookies (ideal for Single Sign-On / Google Workspace / Microsoft), official Web Service Security Tokens, or direct credentials.
- **⚡ Event-Driven Academic Monitoring**:
  - **Zero-Cost In-Memory Event Bus**: Built on Python `asyncio.Queue` with zero external dependencies (no Kafka or Redis required).
  - **Live Server-Sent Events (SSE)**: Pushes real-time alerts directly into the browser (`assignment.urgent`, `assignment.due_soon`, `grade.new`).
  - **Outgoing Webhooks**: Dispatches events to Telegram bots, Discord webhooks, or AWS SNS topics.
- **🔐 Privacy & Security First**:
  - Zero server-side persistence: No database, no file caches, no credential logs.
  - HttpOnly, SameSite=Lax signed JWT session cookies protect tokens against XSS.
- **📚 Real-time Academic Data Retrieval**:
  - **Enrolled Courses**: Course listing, shortnames, categories, and progress tracking.
  - **Course Syllabus & Modules**: Sections, PDF resources, discussion forums, quizzes, and assignment links.
  - **Assignments & Deadlines**: Formatted due dates, submission status, and overdue flags.
  - **Grades & Feedback**: Course totals, evaluation breakdown, and teacher feedback comments.

- **⚡ Built-in Diagnostics & Health Monitoring**:
  - Live round-trip latency measurement to `https://learn.ucu.edu.ua/`.
  - Protocol status checks for Moodle REST API and Mobile Authentication endpoints.
- **🎨 Modern Web Interface**:
  - Sleek, responsive dark-mode UI with glassmorphism built with Tailwind CSS.

---

## 🏗️ Architecture & Security Model

```
Browser (User)
      │
      │ 1. POST /api/auth/login {username, password} (Over TLS)
      ▼
FastAPI Gateway (BFF)
      │
      │ 2. POST https://learn.ucu.edu.ua/login/token.php
      ▼
Moodle Authentication Server
      │
      │ 3. Issues Moodle Web Service Token
      ▼
FastAPI Gateway
      │
      │ 4. Encrypts token into signed JWT session cookie (HttpOnly)
      ▼
Browser (Receives Session Cookie)
      │
      │ 5. GET /api/courses (Sends secure Cookie)
      ▼
FastAPI Gateway
      │
      │ 6. POST https://learn.ucu.edu.ua/webservice/rest/server.php
      ▼
Moodle REST API Server
```

---

## 🚀 Quick Start (Running Locally)

Anyone can clone and run this repository on **Windows**, **macOS**, or **Linux** in less than 2 minutes.

### 1. Clone Repository & Setup

```bash
git clone https://github.com/shkundapn/cms_obgortka.git
cd cms_obgortka
```

### 2. Create & Activate Virtual Environment

**On Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**On macOS / Linux (bash/zsh):**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. (Optional) Setup Environment File
Copy the example configuration (all variables have safe defaults, so this is optional for local development):
```bash
# Windows PowerShell:
Copy-Item .env.example .env

# macOS / Linux:
cp .env.example .env
```

### 5. Start the Application
```bash
python run.py
# or: uvicorn app.main:app --reload --port 8000
```

Open your browser at: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

> 💡 **No university account? No problem!**  
> Click **"Use Instant Demo Sandbox Student Account"** on the login screen to test all features with rich mock courses, assignments, grades, and real-time SSE events immediately.

---

## 🐳 Quick Start with Docker (Zero Setup)

If you have Docker installed, you don't even need Python:

```bash
docker compose up --build
```

Then visit **[http://127.0.0.1:8000](http://127.0.0.1:8000)**.

---

## 🧪 Testing

Run the automated test suite with pytest:
```powershell
.venv\Scripts\pytest.exe
```

---

## ⚙️ Configuration (`.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `MOODLE_BASE_URL` | Base URL of Moodle LMS | `https://learn.ucu.edu.ua` |
| `MOODLE_SERVICE_SHORTNAME` | Moodle auth service | `moodle_mobile_app` |
| `MOODLE_MOCK_MODE` | Force sandbox demo data | `false` |
| `SECRET_KEY` | Key used to sign session JWTs | *(set in .env)* |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session duration in minutes | `480` (8 hours) |

---

## 📡 API Endpoints

- `GET /` — Web Portal Dashboard
- `POST /api/auth/login` — Authenticate with Moodle username & password
- `POST /api/auth/logout` — End session and invalidate cookie
- `GET /api/auth/me` — Current user profile
- `GET /api/courses` — Enrolled courses
- `GET /api/courses/{course_id}/contents` — Sections, files, activities
- `GET /api/assignments` — Aggregated assignment deadlines
- `GET /api/grades` — Grades and feedback
- `GET /api/system/health` — Live connection health and latency check

---

## 🐳 Docker Deployment

Run locally with Docker Compose:

```bash
docker compose up --build -d
```

Or build and run manually:

```bash
docker build -t moodle-portal .
docker run -p 8000:8000 --env-file .env moodle-portal
```

---

## ☁️ Deploying to AWS

### Option 1: AWS App Runner (Recommended — Fast & Fully Managed)

AWS App Runner provides automatic TLS certificates, HTTPS, auto-scaling, and health checks with zero infrastructure to manage:

1. Push your repository to GitHub.
2. In the AWS Console, open **App Runner** and click **Create Service**.
3. Select **Source code repository**, connect your GitHub account, and choose this repository and the `main` branch.
4. Set build settings:
   - **Runtime**: Python 3
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - *(Or select **Container image** if building via Docker / AWS ECR)*
5. Under **Environment variables**, set:
   - `MOODLE_BASE_URL`: `https://learn.ucu.edu.ua`
   - `COOKIE_SECURE`: `true`
   - `SECRET_KEY`: `<Generate a random 32-character string>`
6. Click **Create & Deploy**. App Runner will provide an `https://xxxxxx.awsapprunner.com` URL with automatic SSL.

### Option 2: AWS Elastic Beanstalk (Docker)

1. Initialize EB CLI:
   ```bash
   eb init -p docker moodle-portal --region eu-central-1
   ```
2. Create environment:
   ```bash
   eb create moodle-portal-env --envvars COOKIE_SECURE=true,SECRET_KEY=your-production-secret-key
   ```
3. Deploy updates anytime:
   ```bash
   eb deploy
   ```

### Option 3: AWS EC2 / Lightsail (Docker Compose)

1. Launch an Ubuntu EC2 or Lightsail instance and install Docker:
   ```bash
   sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin
   ```
2. Clone your repository:
   ```bash
   git clone <YOUR_REPO_URL>
   cd cms_oblogka
   cp .env.example .env
   # Edit .env with your production SECRET_KEY and COOKIE_SECURE=true
   ```
3. Run container:
   ```bash
   sudo docker compose up -d
   ```

