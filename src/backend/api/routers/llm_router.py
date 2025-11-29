"""
LLM API router
"""
import json
import logging
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from ...dependencies import dependencies

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm", tags=["llm"])

