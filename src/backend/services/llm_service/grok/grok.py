import asyncio
import json
import logging
import os

import redis
from xai_sdk import Client
from xai_sdk.chat import user, system, assistant

from src.backend.config.config import settings
from src.backend.schemas.chat.llm import ChatRequest, ChatResponse
from src.backend.services.llm_service.grok.grok_collection import GrokCollection
from src.backend.services.storage.supabase_storage import SupabaseStorage
from xai_sdk.tools import web_search, x_search, code_execution


logger = logging.getLogger(__name__)

MODEL = "grok-4-1-fast-reasoning"
MAX_MESSAGES = 50
REDIS_KEY_PREFIX = "grok:messages"

SYSTEM_PROMPT = (
    "You are a helpful assistant. Keep responses concise. "
    "Use markdown formatting. Wrap all math expressions in $...$ delimiters "
    "using LaTeX commands (e.g. $\\\\sum$, $\\\\omega$), never Unicode math symbols."
)


class LlmGrok:

    def __init__(self, supabase_storage: SupabaseStorage):
        self._client = Client(api_key=os.getenv("XAI_API_KEY"))
        self._supabase = supabase_storage
        self._redis: redis.Redis = redis.Redis.from_url(settings.redis_url, decode_responses=False)
        self._collection = GrokCollection()

    # ── Redis ─────────────────────────────────────────────────────────────────

    def _rkey(self, thread_id: str) -> str:
        return f"{REDIS_KEY_PREFIX}:{thread_id}"

    def _load_history(self, thread_id: str) -> list[dict] | None:
        raw = self._redis.get(self._rkey(thread_id))
        return json.loads(raw) if raw else None

    def _save_history(self, thread_id: str, messages: list[dict]) -> None:
        self._redis.setex(self._rkey(thread_id), settings.redis_thread_ttl, json.dumps(messages[-MAX_MESSAGES:]))

    def _refresh_ttl(self, thread_id: str) -> None:
        self._redis.expire(self._rkey(thread_id), settings.redis_thread_ttl)

    def delete_thread(self, thread_id: str) -> int:
        return self._redis.delete(self._rkey(thread_id))

    # ── Cold start ────────────────────────────────────────────────────────────

    async def _cold_start(self, thread_id: str) -> list[dict]:
        if not await self._supabase.thread_exists(thread_id):
            return []
        rows = await self._supabase.load_recent_messages(thread_id)
        history = []
        for row in rows:
            content = row["content"]
            text = " ".join(b["text"] for b in content if b.get("type") == "text") if isinstance(content, list) else str(content)
            history.append({"role": row["role"], "content": text})
        logger.info("Cold start: %d messages for thread %s", len(history), thread_id)
        return history

    # ── Chat ──────────────────────────────────────────────────────────────────

    async def chat(self, request: ChatRequest) -> ChatResponse:
        # 1. Refresh TTL and load history
        self._refresh_ttl(request.thread_id)
        history = self._load_history(request.thread_id)
        if history is None:
            history = await self._cold_start(request.thread_id)

        # 2. Build user text (original — used for history and storage)
        user_text = " ".join(item["text"] for item in request.content if item.get("type") == "text")

        # 3. Get RAG context from selected documents
        context = await self.get_context(request)

        # Build prompt text: inject context only for the model call, keep user_text clean for history
        if context:
            prompt_text = f"Given the context to assist you answer the question:\n\n{context}\n\nQuestion: {user_text}"
        else:
            prompt_text = user_text

        # 4. Call xAI SDK — sync, run in executor to avoid blocking event loop
        def _call():
            chat = self._client.chat.create(model=MODEL)
            chat.append(system(SYSTEM_PROMPT))
            for msg in history:
                if msg["role"] == "user":
                    chat.append(user(msg["content"]))
                elif msg["role"] == "assistant":
                    chat.append(assistant(msg["content"]))
            chat.append(user(prompt_text))
            return chat.sample()

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, _call)

        ai_text = response.content
        u = response.usage
        input_tokens = getattr(u, "prompt_tokens", 0) or getattr(u, "input_tokens", 0)
        output_tokens = getattr(u, "completion_tokens", 0) or getattr(u, "output_tokens", 0)

        # 5. Update Redis history
        history.append({"role": "user", "content": user_text})
        history.append({"role": "assistant", "content": ai_text})
        self._save_history(request.thread_id, history)

        # 6. Persist to Supabase
        await self._supabase.save_message(
            user_id=request.user_id, thread_id=request.thread_id,
            role="user", content=[{"type": "text", "text": user_text}], token_count=input_tokens,
        )
        resp = await self._supabase.save_message(
            user_id=request.user_id, thread_id=request.thread_id,
            role="assistant", content=[{"type": "text", "text": ai_text}], token_count=output_tokens,
        )

        return ChatResponse(
            id=resp["id"],
            role=resp["role"],
            content=[{"type": "text", "text": ai_text}],
            created_at=resp["created_at"],
            total_tokens=input_tokens + output_tokens,
        )
    async def _source_ids_to_xai_file_ids(self, source_ids: list[str]) -> list[str]:
        """Convert our DB document UUIDs to xAI file IDs for collection search."""
        result = []
        for source_id in source_ids:
            result.append(await self._supabase.get_collection_file_id(source_id))
        return result

    async def get_context(self, request: ChatRequest) -> str:
        """Search the xAI collection with selected documents and return joined context chunks."""
        if not request.source_ids:
            return ""
        xai_file_ids = await self._source_ids_to_xai_file_ids(request.source_ids)
        results = self._collection.search_collection(
            selected_files=xai_file_ids,
            query=request.content[0]["text"],
        )
        chunks = [match.chunk_content for match in results.matches if match.chunk_content]
        context = "\n\n".join(chunks)
        logger.info(f"RAG context ({len(chunks)} chunks): {context[:200]}...")
        return context