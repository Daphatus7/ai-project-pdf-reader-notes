# @file        llm_session_management.py
# @description 
# @author      [Peiyu Wang]
# @date        1/1/2026
# @license     © 2026 . All rights reserved.
import logging

from src.backend.services.llm_service.llm_session import LlmSession
import redis
import secrets
import hmac
import hashlib
from datetime import datetime, timezone


def _generate_session_id() -> str:
    """CSPRNG 生成不可预测的 session ID（128位+）"""
    return secrets.token_urlsafe(32)

class LlmSessionManager:

    def __init__(self, secret_key: str, ttl: int = 1800):
        self.sessions = redis.Redis(host='localhost', port=6379, decode_responses=True)
        self.secret = secret_key
        self.ttl = ttl

    def _sign(self, session: LlmSession) -> str:
        data = f"{session.session_id}:{session.user_id}:{session.thread_id}"
        return hmac.new(self.secret.encode(), data.encode(), hashlib.sha256).hexdigest()[:32]

    def __create_session(self, user_id: str, thread_id: str) -> str:
        
        session_id = _generate_session_id()
        now = datetime.now(timezone.utc).isoformat()
        session = LlmSession(
            session_id=secrets.token_urlsafe(32),
            thread_id=thread_id,
            user_id=user_id,
            status="active",
            created_at=now,
            last_active_at=now,
            signature="",
            )
        session.signature = self._sign(session)
        
        signature = self._sign(session)

        key = f"session:{session_id}"
        pipe = self.sessions.pipeline()
        self.sessions.hset(key, mapping=session.to_dict())
        pipe.expire(key, self.ttl)
        self.sessions.sadd(f"user_sessions:{user_id}", session.session_id)
        pipe.execute()

        # 返回给客户端：session_id:signature
        return f"{session_id}:{signature}"

    def get_session(self, ):
        """
            1. 假设用户已经被验证了身份
            2. 当用户想使用这个服务的时候，先尝试获取session，
            3. 如果这个用户在服务器中llm-session  是已经active 那么用户直接使用已经存在的instance
                a. 每个session 需要包含 active session 的 thread_id 等等一系列获取方式
                b. todo 目前没有已经实现的chat instance
            4. 如果这个instance 不存在，那么创建一个新的session
        :return:
        """

    def validate(self, token: str) -> dict | None:
        """验证 session，返回 session 数据或 None"""
        try:
            session_id, signature = token.rsplit(":", 1)
        except ValueError:
            return None

        key = f"session:{session_id}"
        data = self.sessions.hgetall(key)

        if not data or data.get("status") != "active":
            return None

        # 验证签名
        expected_sig = self._sign(LlmSession.from_dict(data))
        if not hmac.compare_digest(signature, expected_sig):
            return None

        # 续期
        self.sessions.expire(key, self.ttl)
        self.sessions.hset(key, "last_active_at", datetime.now(timezone.utc).isoformat())

        return data

    def terminate_session(self, token: str, user_id: str) -> bool:
        """关闭 session"""
        data = self.validate(token)
        if not data or data["user_id"] != user_id:
            return False

        session_id = data["session_id"]
        self.sessions.hset(f"session:{session_id}", "status", "closed")
        self.sessions.srem(f"user_sessions:{user_id}", session_id)
        return True
    
        
    