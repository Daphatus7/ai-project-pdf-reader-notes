import json
import logging
import os
from typing import AsyncIterator

import redis
from xai_sdk import AsyncClient
from xai_sdk.chat import user, system, assistant, image as xai_image, tool_result
from xai_sdk.tools import web_search, x_search

from src.backend.config.config import settings
from src.backend.schemas.chat.llm import ChatRequest, ChatResponse
from src.backend.services.llm_service.grok.grok_collection import GrokCollection
from src.backend.services.storage.supabase_storage import SupabaseStorage


logger = logging.getLogger(__name__)

MODEL = "grok-4-1-fast-reasoning"
MAX_MESSAGES = 20
MAX_TOOL_ROUNDS = 5
REDIS_KEY_PREFIX = "grok:messages"

# Built-in tools that run on xAI servers — no local dispatch needed
TOOLS = [web_search(), x_search()]
BUILTIN_TOOLS = {"web_search", "x_search"}

SYSTEM_PROMPT = (
    "You are a helpful assistant. Keep responses concise. "
    "Use markdown formatting. Wrap all math expressions in $...$ delimiters "
    "using LaTeX commands (e.g. $\\\\sum$, $\\\\omega$), never Unicode math symbols."
)


class LlmGrok:

    def __init__(self, supabase_storage: SupabaseStorage):
        # timeout=600 required for reasoning models to avoid premature connection closure during streaming
        self._client = AsyncClient(
            api_key=os.getenv("XAI_API_KEY"),
            management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
            timeout=600)
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
        rows = await self._supabase.load_recent_messages(thread_id, max_messages=MAX_MESSAGES)
        history = []
        for row in rows:
            content = row["content"]
            text = " ".join(b["text"] for b in content if b.get("type") == "text") if isinstance(content, list) else str(content)
            history.append({"role": row["role"], "content": text})
        logger.info("Cold start: %d messages for thread %s", len(history), thread_id)
        return history

    # ── Shared setup ──────────────────────────────────────────────────────────

    async def _prepare_request(self, request: ChatRequest) -> tuple[list[dict], str, str, list[dict]]:
        """Load history, build user text, prompt text with optional RAG context, and image items."""
        self._refresh_ttl(request.thread_id)
        history = self._load_history(request.thread_id)
        if history is None:
            history = await self._cold_start(request.thread_id)

        user_text = " ".join(item["text"] for item in request.content if item.get("type") == "text")
        image_items = [item for item in request.content if item.get("type") == "image"]

        context = await self.get_context(request)
        if context:
            prompt_text = f"Given the context to assist you answer the question:\n\n{context}\n\nQuestion: {user_text}"
        else:
            prompt_text = user_text

        return history, user_text, prompt_text, image_items

    def _build_chat(self, history: list[dict], prompt_text: str, image_items: list[dict] | None = None):
        """Create and populate an xAI chat object, with optional multimodal image content."""
        chat = self._client.chat.create(model=MODEL, tools=TOOLS)
        chat.append(system(SYSTEM_PROMPT))
        for msg in history:
            if msg["role"] == "user":
                chat.append(user(msg["content"]))
            elif msg["role"] == "assistant":
                chat.append(assistant(msg["content"]))

        # Build multimodal user message: text + images (data URI format required by xAI)
        if image_items:
            contents = [prompt_text] + [
                xai_image(image_url=f"data:{img['mime_type']};base64,{img['data']}", detail="high")
                for img in image_items
            ]
            chat.append(user(*contents))
        else:
            chat.append(user(prompt_text))
        return chat

    # ── Chat (non-streaming) ──────────────────────────────────────────────────

    async def chat(self, request: ChatRequest) -> ChatResponse:
        history, user_text, prompt_text, image_items = await self._prepare_request(request)

        chat_obj = self._build_chat(history, prompt_text, image_items)

        # Tool call rounds: sample() silently until no tool calls or limit reached
        response = await chat_obj.sample()
        for _ in range(MAX_TOOL_ROUNDS):
            if not response.tool_calls:
                break
            chat_obj.append(response)
            response = await chat_obj.sample()
        else:
            logger.warning("Tool call loop hit MAX_TOOL_ROUNDS for thread %s", request.thread_id)

        ai_text = response.content
        u = response.usage
        input_tokens = getattr(u, "prompt_tokens", 0) or getattr(u, "input_tokens", 0)
        output_tokens = getattr(u, "completion_tokens", 0) or getattr(u, "output_tokens", 0)

        # Update Redis history
        history.append({"role": "user", "content": user_text})
        history.append({"role": "assistant", "content": ai_text})
        self._save_history(request.thread_id, history)

        # Persist to Supabase
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
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )

    # ── Streaming chat ────────────────────────────────────────────────────────

    async def chat_stream(self, request: ChatRequest) -> AsyncIterator[str]:
        """Yield SSE-formatted lines. Each line is `data: <json>\\n\\n`.

        Event types:
          {"type": "chunk", "text": "<incremental text>"}
          {"type": "done",  "id": "<msg_id>", "created_at": "<iso>", "total_tokens": N}
          {"type": "error", "message": "<description>"}
        """
        history, user_text, prompt_text, image_items = await self._prepare_request(request)
        chat_obj = self._build_chat(history, prompt_text, image_items)

        full_text = ""
        final_response = None
        try:
            # Tool call rounds: sample() silently until no tool calls or limit reached
            response = await chat_obj.sample()
            for _ in range(MAX_TOOL_ROUNDS):
                if not response.tool_calls:
                    break
                chat_obj.append(response)
                response = await chat_obj.sample()
            else:
                logger.warning("Tool call loop hit MAX_TOOL_ROUNDS for thread %s", request.thread_id)

            # Stream only the final answer to the user
            async for response, chunk in chat_obj.stream():
                if chunk.content:
                    full_text += chunk.content
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk.content})}\n\n"
                final_response = response
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
            return

        input_tokens, output_tokens = 0, 0
        if final_response:
            u = final_response.usage
            input_tokens = getattr(u, "prompt_tokens", 0) or getattr(u, "input_tokens", 0)
            output_tokens = getattr(u, "completion_tokens", 0) or getattr(u, "output_tokens", 0)

        # Persist history and messages after stream completes
        history.append({"role": "user", "content": user_text})
        history.append({"role": "assistant", "content": full_text})
        self._save_history(request.thread_id, history)

        await self._supabase.save_message(
            user_id=request.user_id, thread_id=request.thread_id,
            role="user", content=[{"type": "text", "text": user_text}], token_count=input_tokens,
        )
        resp = await self._supabase.save_message(
            user_id=request.user_id, thread_id=request.thread_id,
            role="assistant", content=[{"type": "text", "text": full_text}], token_count=output_tokens,
        )

        yield f"data: {json.dumps({'type': 'done', 'id': resp['id'], 'created_at': resp['created_at'], 'total_tokens': input_tokens + output_tokens, 'input_tokens': input_tokens, 'output_tokens': output_tokens})}\n\n"

    # ── RAG context ───────────────────────────────────────────────────────────


    async def get_context(self, request: ChatRequest) -> str:
        """Search the xAI collection with selected documents and return joined context chunks."""
        if not request.source_ids:
            return ""
        xai_collection_id = await self._supabase.get_project_collection_id# get supabase collection id via project_id
        xai_source_ids = await self._supabase.get_xai_file_ids(request.source_ids)
        # user file_id
        if len(xai_source_ids) <= 0:
            return ""
        query = next((item["text"] for item in request.content if item.get("type") == "text"), "")
        # Search within the project's collection; filter chunks to user-selected files only
        matches = await self._collection.search_collection(
            collection_id=xai_collection_id,
            selected_files=xai_source_ids,
            query=query,
        )
        logger.info(matches)
        chunks = [match.chunk_content for match in matches if match.chunk_content]
        context = "\n\n".join(chunks)
        logger.info(f"RAG context ({len(chunks)} chunks): {context[:200]}...")
        return context
