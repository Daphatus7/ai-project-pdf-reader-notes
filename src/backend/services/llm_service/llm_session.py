# @file        llm_session.py
# @description 
# @author      [Peiyu Wang]
# @date        1/1/2026
# @license     © 2026 . All rights reserved.
from dataclasses import dataclass, asdict
from typing import Literal


@dataclass
class LlmSession:
    session_id: str
    thread_id: str
    user_id: str
    status: Literal["active", "closed"]
    created_at: str
    last_active_at: str
    signature: str

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "LlmSession":
        return cls(**data)
    
    