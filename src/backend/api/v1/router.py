"""
API v1 Router - Aggregates all v1 endpoints.

This module combines all v1 API routers into a single router
that can be included in the main FastAPI application.
"""
from fastapi import APIRouter

from src.backend.api.v1 import llm, auth, users, project, notes, usage

# Create the main v1 router
router = APIRouter(prefix='/api/v1')

# Include all v1 sub-routers
router.include_router(llm.router)
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(project.router)
router.include_router(notes.router)
router.include_router(usage.router)
