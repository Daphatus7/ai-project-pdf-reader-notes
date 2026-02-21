import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.pdf_backend.api.v1.documents import router as documents_router
from src.pdf_backend.config.config import settings

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="PDF Backend", version="1.0.0")

# Only the main backend server is allowed to call this service.
# All other origins are rejected at the CORS level.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
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
