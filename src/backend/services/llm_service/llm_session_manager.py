# @file        llm_session_management.py
# @description 
# @author      [Peiyu Wang]
# @date        1/1/2026
# @license     © 2026 . All rights reserved.
from src.backend.services.llm_service.llm_session import LlmSession
import redis

class LlmSessionManager:
    
    def __init__(self):
        self.r = redis.Redis(host='localhost', port=6379, decode_responses=True)

        self.sessions = [LlmSession]
    
        
    