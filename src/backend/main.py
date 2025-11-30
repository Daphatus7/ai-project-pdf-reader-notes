"""
FastAPI application entry point for LLM backend service
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys
from config import settings
from servers import services
from api.routers.llm_call.llm_call import router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
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
app.include_router(router)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET","POST","OPTIONS"],
    allow_headers=["authorization","content-type","accept"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
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
