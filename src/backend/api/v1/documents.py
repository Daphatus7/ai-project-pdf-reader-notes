"""
Document job endpoints:
  POST /webhook/pdf   — called by pdf-backend when a job finishes
  GET  /stream/{job_id} — SSE stream for frontend clients
"""
import json
import logging
import asyncio

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from src.backend.services.sse_manager import sse_manager

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Webhook from pdf-backend ───────────────────────────────────────────────────

class _WebhookPayload(BaseModel):
    job_id: str
    document_id: str
    status: str
    chunk_count: int = 0
    message: str = ""


@router.post("/webhook/pdf", include_in_schema=False)
async def receive_pdf_webhook(payload: _WebhookPayload):
    """
    Receive job completion from pdf-backend and forward to the waiting SSE client.
    This endpoint should NOT be exposed publicly — restrict at the network/proxy level.
    """
    event_data = json.dumps({
        "job_id": payload.job_id,
        "document_id": payload.document_id,
        "status": payload.status,
        "chunk_count": payload.chunk_count,
        "message": payload.message,
    })
    sse_manager.push(payload.job_id, event_data)
    logger.info("Webhook received and forwarded for job %s (status=%s)", payload.job_id, payload.status)
    return JSONResponse({"received": True})


# ── SSE stream for frontend ────────────────────────────────────────────────────

_KEEPALIVE_INTERVAL = 15  # seconds between heartbeat comments


@router.get("/stream/{job_id}")
async def stream_job_status(job_id: str, request: Request):
    """
    SSE endpoint. The frontend connects here after submitting a job.
    Streams status events until done/failed, then closes.
    On reconnect, immediately replays the last known state from Redis if job is already finished.
    """
    queue = sse_manager.connect(job_id)

    async def event_generator():
        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break

                try:
                    # Wait for next event with keepalive timeout
                    data = await asyncio.wait_for(queue.get(), timeout=_KEEPALIVE_INTERVAL)
                    yield f"event: status\ndata: {data}\n\n"

                    # Close stream once terminal state is reached
                    parsed = json.loads(data)
                    if parsed.get("status") in ("done", "failed", "not_supported"):
                        break

                except asyncio.TimeoutError:
                    # Send SSE comment as keepalive to prevent proxy timeouts
                    yield ": keepalive\n\n"

        finally:
            sse_manager.disconnect(job_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable Nginx buffering
        },
    )
