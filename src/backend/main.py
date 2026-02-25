"""
FastAPI application entry point for LLM backend service
"""
import dotenv
dotenv.load_dotenv()

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import sys
from src.backend.servers import services
from src.backend.config.config import settings
from src.backend.api import v1_router
from src.backend.schemas.error import AppError

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[
            StarletteIntegration(),
            FastApiIntegration(),
        ],
        traces_sample_rate=0.1,   # 10% of requests for performance tracing
        send_default_pii=False,   # don't attach user IP / email automatically
    )

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ],
    force=True
)

logger = logging.getLogger(__name__)


# Initialize dependencies on startup
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting LLM Backend Service...")
    try:
        services.initialize()
        logger.info("Dependencies initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize dependencies: {e}")
        raise


# Cleanup on shutdown
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down LLM Backend Service...")
    services.shutdown()
    


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager"""
    await startup_event()
    yield
    await shutdown_event()


# Create FastAPI app
app = FastAPI(
    title="AI File Notes LLM Backend",
    lifespan=lifespan,
    description="Backend service for LLM API proxy with streaming support",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Include routers
app.include_router(v1_router)



class LogOriginMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "no-origin")
        logger.info(f"Request from origin: {origin} -> {request.method} {request.url.path}")
        response = await call_next(request)
        return response

logger.info(f"CORS origins allowed: {settings.cors_origins_list}")


# Configure CORS (added before LogOrigin so CORS runs first in the response)
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"],
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET","POST","DELETE","OPTIONS","PUT"],
    allow_headers=["authorization","content-type","accept"],
)
app.add_middleware(LogOriginMiddleware)

# AppError handler — returns flat JSON
@app.exception_handler(AppError)
async def app_error_handler(request, exc: AppError):
    body = {"detail": exc.detail, "code": exc.code}
    if exc.meta:
        body["meta"] = exc.meta
    return JSONResponse(status_code=exc.status_code, content=body)


# Global fallback — catches unexpected exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    sentry_sdk.capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": "INTERNAL_ERROR"}
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "llm-backend",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI File Notes LLM Backend",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower()
    )
