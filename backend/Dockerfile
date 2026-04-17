# ── Stage 1: Build dependencies ───────────────────────────────────────────────
FROM python:3.12-slim AS base

# Install curl for Cloud Run health probes
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Security: don't run as root
RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

# Install Python deps (separate layer for cache efficiency)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app/ ./app/

# Switch to non-root user
USER app

# Cloud Run requires PORT 8080
EXPOSE 8080

# Production: gunicorn with uvicorn workers for async support
# --workers 2  → 2 processes (Cloud Run limits concurrency, 2 is a safe default)
# --worker-class uvicorn.workers.UvicornWorker → async FastAPI support
# --timeout 60 → allow slow Firestore cold-start queries
CMD ["gunicorn", "app.main:app", \
     "--workers", "2", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8080", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
