# Multi-stage Dockerfile for pdf_backend microservice
# Handles PDF extraction, chunking, and RAG vector storage.
# Builds two targets:
#   production  → FastAPI API service (receives uploads, enqueues jobs)
#   worker      → RQ worker service (processes jobs from Redis queue)

FROM python:3.12-slim AS base

WORKDIR /app

# System dependencies required by:
#   libgl1        → opencv requires libGL.so.1 (used by Docling table detection)
#   libglib2.0-0  → opencv requires libgthread-2.0.so.0
#   curl          → health checks
RUN apt-get update && apt-get install -y \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY src/pdf_backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt


ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
# Disable Numba JIT to avoid "no locator available" crash at startup.
# Root installs site-packages; app user can't write cache next to them.
# Impact: projection_by_bboxes runs as pure Python — negligible for PDF layout analysis.
ENV NUMBA_DISABLE_JIT=1

# Non-root user for security
RUN useradd --create-home --shell /bin/bash app


# ── Development stage ──────────────────────────────────────────
FROM base AS development

COPY src ./src
RUN chown -R app:app /app
USER app
EXPOSE 8001

# start-period is long: chonkie neural model downloads on first boot
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

CMD ["uvicorn", "src.pdf_backend.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]


# ── Production stage ───────────────────────────────────────────
FROM base AS production

COPY src/pdf_backend/ ./src/pdf_backend/
COPY src/__init__.py ./src/
RUN chown -R app:app /app
USER app
EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8001}/health || exit 1

CMD ["sh", "-c", "uvicorn src.pdf_backend.main:app --host 0.0.0.0 --port ${PORT:-8001}"]


# ── Worker stage ────────────────────────────────────────────────
FROM base AS worker

COPY src/pdf_backend/ ./src/pdf_backend/
COPY src/__init__.py ./src/
RUN chown -R app:app /app
USER app

# Workers don't expose HTTP — no HEALTHCHECK via curl
# Railway monitors worker health via process exit code
CMD ["python", "-m", "src.pdf_backend.worker"]
