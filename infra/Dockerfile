# ==========================================
# Production Dockerfile for Hustle / Moodle Portal
# Build from repository root: docker build -f infra/Dockerfile -t hustle .
# ==========================================
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install Python dependencies first for optimal Docker layer caching
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy backend and frontend source trees
COPY backend ./backend
COPY frontend ./frontend

# Security: Run as non-privileged user with writable data dir
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/data/staging && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.getenv(\"PORT\", \"8000\")}/healthz')" || exit 1

CMD ["python", "backend/run.py"]
