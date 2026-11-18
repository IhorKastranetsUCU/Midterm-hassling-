# ==========================================
# 🐳 Production Dockerfile for Moodle Portal
# ==========================================
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install dependencies first for optimal Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Security: Run as non-privileged user with writable data dir
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/data/staging && \
    chown -R appuser:appuser /app
USER appuser

# Expose default HTTP port
EXPOSE 8000

# Local container healthcheck (dynamic PORT, no external Moodle pings)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.getenv(\"PORT\", \"8000\")}/healthz')" || exit 1

# Start FastAPI production server
CMD ["python", "run.py"]
