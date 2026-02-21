# Multi-stage Dockerfile for pdf_backend microservice
# Handles PDF extraction, chunking, and RAG vector storage.
# Heavy ML dependencies (unstructured, cv2, chonkie) require numpy<2.

FROM python:3.12-slim AS base

WORKDIR /app

# System dependencies required by:
#   libgl1, libglib2.0-0 → OpenCV (cv2)
#   poppler-utils         → unstructured PDF parsing
#   tesseract-ocr         → OCR fallback in unstructured
#   libmagic1             → file-type detection in unstructured
#   curl                  → health checks
RUN apt-get update && apt-get install -y \
    curl \
    libgl1 \
    libglib2.0-0 \
    libmagic1 \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# numpy must be pinned <2 — cv2 4.8.x was compiled against NumPy 1.x
COPY src/pdf_backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

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
