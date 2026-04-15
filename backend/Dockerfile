FROM python:3.12-slim AS base

# Security & performance: don't run as root
RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

# Install deps first (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY app/ ./app/

# Switch to non-root user
USER app

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
