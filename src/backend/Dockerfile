# Multi-stage Dockerfile for FastAPI backend
# Stage 1: Base - Install dependencies (shared between dev and prod)
FROM python:3.12-slim AS base

WORKDIR /app

# Install system dependencies needed for health checks
RUN apt-get update && apt-get install -y \
    curl \
    libgl1 \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Layer 1: Heavy ML/PDF deps — rarely change, cached separately
COPY src/backend/requirements-heavy.txt ./
RUN --mount=type=cache,id=pip-cache,target=/root/.cache/pip \
    pip install -r requirements-heavy.txt

# Layer 2: Light deps — rebuild only this layer when changed
COPY src/backend/requirements.txt ./
RUN --mount=type=cache,id=pip-cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app

# Stage 2: Development - Hot reload with uvicorn --reload
FROM base AS development
COPY src ./src
RUN chown -R app:app /app
USER app
EXPOSE 8000
# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
# Start with auto-reload for development
CMD ["uvicorn", "src.backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Stage 3: Production - Optimized for deployment
FROM base AS production
COPY src/backend/ ./src/backend/
COPY src/__init__.py ./src/
RUN chown -R app:app /app
USER app
EXPOSE ${PORT:-8000}
# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1
# Start without reload for production - Railway injects $PORT, local defaults to 8000
CMD ["sh", "-c", "uvicorn src.backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
