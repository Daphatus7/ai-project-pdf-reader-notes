import base64
import json
import logging
import os
from dataclasses import dataclass
from typing import AsyncIterator

from pydantic_ai import Agent, RunContext
from pydantic_ai.capabilities import WebSearch
from pydantic_ai.messages import (
    BinaryContent,
    ModelMessage,
    ModelRequest,
    ModelResponse,
    TextPart,
    UserPromptPart,
)
from pydantic_ai.models.xai import XaiModel
from pydantic_ai.providers.xai import XaiProvider
from xai_sdk import AsyncClient

from src.backend.schemas.chat.llm import ChatRequest, ChatResponse
from src.backend.services.llm_service.grok.grok_collection import search_collection
from src.backend.services.storage.supabase_storage import SupabaseStorage


logger = logging.getLogger(__name__)

# Single reasoning model — it decides on its own whether to call search_document / web search
MODEL_REASONING = "grok-4.6"
# Fast non-reasoning model — only used for cheap thread-title generation
MODEL_TITLE = "grok-4-1-fast-non-reasoning"

MAX_MESSAGES = 20

SYSTEM_PROMPT = (
    "You are a collaborator . "
    "Make sure Wrap all math expressions in $...$ delimiters "
    "using LaTeX commands (e.g. $\\\\sum$, $\\\\omega$), never Unicode math symbols."
    "Use H1 H2 H3 if needed to enhance readability."
)


@dataclass
class ChatDeps:
    """Per-request data made available to the agent's tools via RunContext."""
    project_id: str | None
    source_ids: list | None


class LlmGrok:

    def __init__(self, supabase_storage: SupabaseStorage):
        self._supabase = supabase_storage

        # timeout=600 required for reasoning models to avoid premature connection closure during streaming.
        # The gRPC channel inside AsyncClient binds to the event loop on first RPC — which happens during
        # request handling (run / run_stream), i.e. the serving loop — so no cross-loop issues here.
        self._client = AsyncClient(
            api_key=os.getenv("XAI_API_KEY"),
            management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
            timeout=600,
        )
        provider = XaiProvider(xai_client=self._client)

        # Main agent: reasoning model + native web search + a document-search tool.
        # The model itself decides whether to retrieve (replaces the old two-stage router).
        self._agent = Agent(
            XaiModel(MODEL_REASONING, provider=provider),
            deps_type=ChatDeps,
            instructions=SYSTEM_PROMPT,
            capabilities=[WebSearch()],
        )

        # Lightweight agent for thread-title generation (no tools, plain string output).
        self._title_agent = Agent(
            XaiModel(MODEL_TITLE, provider=provider),
            instructions=(
                "Generate a short title (5-8 words) for a conversation based on the exchange below. "
                "Reply with ONLY the title — no punctuation, no quotes, no extra text."
            ),
        )

        # Dynamic instruction: bias the model toward retrieval when the user selected documents.
        @self._agent.instructions
        def _doc_hint(ctx: RunContext[ChatDeps]) -> str:
            if ctx.deps.source_ids and ctx.deps.project_id:
                return (
                    "The user has selected one or more documents. For any question about their "
                    "content, call the search_document tool before answering."
                )
            return ""

        # Custom tool — the model calls this when it wants document context (RAG).
        @self._agent.tool
        async def search_document(ctx: RunContext[ChatDeps], query: str) -> str:
            """Search the user's selected documents (PDFs) for content relevant to the query.

            Use this whenever the user asks a question about their documents (文档, 文档内容, 报告).
            """
            logger.info("search_document tool called with query: %s", query)
            context = await self._get_context(query, ctx.deps.project_id, ctx.deps.source_ids)
            return context if context else "No relevant content found in the selected documents."

    # ── History (loaded from Supabase on every request) ───────────────────────

    async def _load_history(self, thread_id: str) -> list[dict]:
        """Load recent conversation history from Supabase."""
        if not await self._supabase.thread_exists(thread_id):
            return []
        rows = await self._supabase.load_recent_messages(thread_id, max_messages=MAX_MESSAGES)
        history = []
        for row in rows:
            content = row["content"]
            text = " ".join(b["text"] for b in content if b.get("type") == "text") if isinstance(content, list) else str(content)
            history.append({"role": row["role"], "content": text})
        logger.info("Loaded %d messages for thread %s", len(history), thread_id)
        return history

    # ── Shared setup ──────────────────────────────────────────────────────────

    async def _prepare_request(self, request: ChatRequest) -> tuple[list[dict], str, list[dict]]:
        """Load history from Supabase, extract user text and image items."""
        history = await self._load_history(request.thread_id)
        user_text = " ".join(item["text"] for item in request.content if item.get("type") == "text")
        image_items = [item for item in request.content if item.get("type") == "image"]
        return history, user_text, image_items

    @staticmethod
    def _to_message_history(history: list[dict]) -> list[ModelMessage]:
        """Convert Supabase {role, content} rows into Pydantic AI message history."""
        messages: list[ModelMessage] = []
        for msg in history:
            if msg["role"] == "user":
                messages.append(ModelRequest(parts=[UserPromptPart(content=msg["content"])]))
            elif msg["role"] == "assistant":
                messages.append(ModelResponse(parts=[TextPart(content=msg["content"])]))
        return messages

    @staticmethod
    def _build_user_prompt(user_text: str, image_items: list[dict]):
        """Build the current-turn prompt: plain text, or text + images for multimodal input."""
        if not image_items:
            return user_text
        parts: list = [user_text]
        for img in image_items:
            parts.append(BinaryContent(data=base64.b64decode(img["data"]), media_type=img["mime_type"]))
        return parts

    # ── Chat (non-streaming) ──────────────────────────────────────────────────

    async def chat(self, request: ChatRequest) -> ChatResponse:
        history, user_text, image_items = await self._prepare_request(request)
        deps = ChatDeps(project_id=request.project_id, source_ids=request.source_ids)

        result = await self._agent.run(
            self._build_user_prompt(user_text, image_items),
            deps=deps,
            message_history=self._to_message_history(history),
        )

        ai_text = result.output
        usage = result.usage
        input_tokens = usage.input_tokens or 0
        output_tokens = usage.output_tokens or 0

        # Persist to Supabase (source of truth for history); user_id injected from auth token
        user_id = request.user_id or ""
        await self._supabase.save_message(
            user_id=user_id, thread_id=request.thread_id,
            role="user", content=[{"type": "text", "text": user_text}], token_count=input_tokens,
        )
        resp = await self._supabase.save_message(
            user_id=user_id, thread_id=request.thread_id,
            role="assistant", content=[{"type": "text", "text": ai_text}], token_count=output_tokens,
        )

        # Auto-generate title on first exchange (history was empty before this request)
        if not history:
            try:
                generated_title = await self._generate_title(user_text, ai_text)
                await self._supabase.update_thread_title(request.thread_id, generated_title)
            except Exception as exc:
                logger.warning("Failed to generate thread title: %s", exc)

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

        The whole pipeline (history load, retrieval via tool, streaming, persistence) runs inside
        one try/except so any failure surfaces as an `error` event instead of crashing the ASGI
        response mid-stream.
        """
        try:
            history, user_text, image_items = await self._prepare_request(request)
            deps = ChatDeps(project_id=request.project_id, source_ids=request.source_ids)

            full_text = ""
            input_tokens, output_tokens = 0, 0
            async with self._agent.run_stream(
                self._build_user_prompt(user_text, image_items),
                deps=deps,
                message_history=self._to_message_history(history),
            ) as result:
                async for delta in result.stream_text(delta=True):
                    if delta:
                        full_text += delta
                        yield f"data: {json.dumps({'type': 'chunk', 'text': delta})}\n\n"
                usage = result.usage
                input_tokens = usage.input_tokens or 0
                output_tokens = usage.output_tokens or 0

            # Persist to Supabase after stream completes; user_id injected from auth token
            user_id = request.user_id or ""
            await self._supabase.save_message(
                user_id=user_id, thread_id=request.thread_id,
                role="user", content=[{"type": "text", "text": user_text}], token_count=input_tokens,
            )
            resp = await self._supabase.save_message(
                user_id=user_id, thread_id=request.thread_id,
                role="assistant", content=[{"type": "text", "text": full_text}], token_count=output_tokens,
            )

            # Auto-generate title on first exchange (history was empty before this request)
            generated_title = None
            if not history:
                try:
                    generated_title = await self._generate_title(user_text, full_text)
                    await self._supabase.update_thread_title(request.thread_id, generated_title)
                except Exception as exc:
                    logger.warning("Failed to generate thread title: %s", exc)
        except Exception as exc:
            logger.exception("chat_stream failed")
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
            return

        done_payload: dict = {
            'type': 'done',
            'id': resp['id'],
            'created_at': resp['created_at'],
            'total_tokens': input_tokens + output_tokens,
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
        }
        if generated_title:
            done_payload['title'] = generated_title
        yield f"data: {json.dumps(done_payload)}\n\n"

    # ── Thread title generation ────────────────────────────────────────────────

    async def _generate_title(self, user_text: str, ai_text: str) -> str:
        """Generate a short thread title from the first exchange using the fast non-reasoning model."""
        result = await self._title_agent.run(
            f"User: {user_text[:300]}\nAssistant: {ai_text[:300]}"
        )
        return result.output.strip()[:80]

    # ── RAG search (called by the search_document tool) ───────────────────────

    async def _get_context(self, query: str, project_id: str | None, source_ids: list | None) -> str:
        """Search the xAI collection and return joined context chunks for the given query."""
        if not source_ids or not project_id:
            return ""

        logger.info("RAG search: project=%s sources=%s query=%s", project_id, source_ids, query)
        xai_collection_id = await self._supabase.get_project_collection_id(project_id)
        xai_source_ids = await self._supabase.get_xai_file_ids(source_ids)
        logger.info("Searching collection %s with files %s", xai_collection_id, xai_source_ids)

        matches = await search_collection(
            collection_id=xai_collection_id,
            selected_files=xai_source_ids,
            query=query,
        )
        chunks = [match.chunk_content for match in matches if match.chunk_content]
        context = "\n\n".join(chunks)
        logger.info("RAG context (%d chunks): %s...", len(chunks), context[:200])
        return context
