# @file        models.py
# @description 
# @author      [Peiyu Wang]
# @date        5/1/2026
# @license     © 2026 . All rights reserved.
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

@dataclass(frozen=True)
class SourceRef:
    tenant_id: str
    source_id: str
    source_version_id: str
    title: str

@dataclass(frozen=True)
class Chunk:
    tenant_id: str
    source_id: str
    source_version_id: str
    chunk_id: str
    chunk_index: int
    page_start: Optional[int]
    page_end: Optional[int]
    section: Optional[str]
    text: str
    metadata: Dict[str, Any]

@dataclass(frozen=True)
class RetrievedChunk:
    chunk: Chunk
    score: float

@dataclass(frozen=True)
class ContextItem:
    ref: str  # stable cite key, e.g. "[S:Title v1 p12 c_0012_04]"
    text: str
    cite: Dict[str, Any]

@dataclass(frozen=True)
class ContextPack:
    items: List[ContextItem]