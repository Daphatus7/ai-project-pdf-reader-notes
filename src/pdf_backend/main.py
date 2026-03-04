import logging
import multiprocessing
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.pdf_backend.api.v1.documents import router as documents_router
from src.pdf_backend.config.config import settings

logger = logging.getLogger(__name__)

def _start_worker_process() -> multiprocessing.Process:
    """Start the RQ worker in a child process alongside the API server."""
    from src.pdf_backend.worker import _run_single_worker
    # daemon=False so the worker's finally blocks run on shutdown (releases CPU quota, cleans temp files).
    p = multiprocessing.Process(target=_run_single_worker, daemon=False)
    p.start()
    logger.info("RQ worker started (pid=%d)", p.pid)
    return p


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start worker when API starts up.
    worker = _start_worker_process()
    yield
    # Terminate worker when API shuts down.
    worker.terminate()
    worker.join()
    logger.info("RQ worker terminated")


app = FastAPI(title="PDF Backend", version="1.0.0", lifespan=lifespan)

# Only the main backend server is allowed to call this service.
# All other origins are rejected at the CORS level.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["POST"],
    allow_headers=["*"],
)

app.include_router(documents_router, prefix="/api/v1/documents", tags=["documents"])


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        "src.pdf_backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
