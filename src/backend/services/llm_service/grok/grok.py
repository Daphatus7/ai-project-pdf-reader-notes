import json
import logging
import os
from typing import AsyncIterator

from xai_sdk import AsyncClient
from xai_sdk.chat import user, system, assistant, image as xai_image, tool_result, tool
from xai_sdk.tools import web_search

from src.backend.schemas.chat.llm import ChatRequest, ChatResponse
from src.backend.services.llm_service.grok.grok_collection import search_collection
from src.backend.services.storage.supabase_storage import SupabaseStorage


logger = logging.getLogger(__name__)

# Stage 1: fast non-reasoning model — tool routing only (no history, query only)
MODEL_ROUTER = "grok-4-1-fast-non-reasoning"
# Stage 2: reasoning model — final answer (full history + injected tool context)
MODEL_REASONING = "rok-4-1-fast-reasoning"

MAX_MESSAGES = 20

# Custom tool definition — executed locally, result returned via tool_result()
SEARCH_DOCUMENT_TOOL = tool(
    name="search_document",
    description=(
        "Search the user's selected documents (PDFs) for content relevant to the query. "
        "Use this whenever the user asks a question about their documents."
        "文档.文档内容. 报告"
    ),
    parameters={
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query to find relevant content in the documents",
            }
        },
        "required": ["query"],
    },
)

# Stage 1: custom tools only — results can be captured locally and injected into stage 2
ROUTER_TOOLS = [SEARCH_DOCUMENT_TOOL]
# Stage 2: built-in tools only — xAI handles them transparently during the final stream/sample
REASONING_TOOLS = [web_search()]

SYSTEM_PROMPT = (
    "You are a helpful assistant. "
    "Make sure Wrap all math expressions in $...$ delimiters "
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

    # ── Stage 1: tool routing (non-reasoning, user query only) ────────────────

    async def _route_tools(self, user_text: str, request: ChatRequest) -> list:
        """Stage 1: non-reasoning model receives only user query, decides and executes tool calls.

        Follows the source-of-truth pattern (single round):
          response = sample()
          if tool_calls → append response → dispatch each custom tool → append results

        Returns list of (assistant tool-call msg + tool_result msgs) to inject into stage 2.
        Built-in tools (web_search) are handled transparently by xAI servers within sample().
        """
        router = self._client.chat.create(model=MODEL_ROUTER, tools=ROUTER_TOOLS)
        router.append(system(SYSTEM_PROMPT))
        router.append(user(user_text))

        response = await router.sample()

        if not response.tool_calls:
            return []

        # Collect messages to inject into the reasoning chat
        extra = []
        router.append(response)
        extra.append(response)

        for tc in response.tool_calls:
            result = await self._dispatch_tool(tc, request)
            tr = tool_result(result)
            router.append(tr)
            extra.append(tr)

        return extra

    # ── Stage 2: reasoning chat (full history + injected tool context) ────────

    def _build_reasoning_chat(self, history: list[dict], user_text: str,
                               image_items: list[dict] | None, extra_messages: list,
                               doc_context: str | None = None):
        """Build reasoning model chat: system + history + user message + injected tool results.

        doc_context: pre-fetched document chunks injected directly into system prompt (MVP fast path).
        web_search passed as built-in tool — xAI handles it transparently in the final call.
        """
        chat = self._client.chat.create(model=MODEL_REASONING, tools=REASONING_TOOLS)

        # Inject document context into system prompt when available (bypasses LLM tool routing)
        system_content = SYSTEM_PROMPT
        if doc_context:
            system_content += f"\n\nRelevant document content for this query:\n{doc_context}"
        chat.append(system(system_content))

        for msg in history:
            if msg["role"] == "user":
                chat.append(user(msg["content"]))
            elif msg["role"] == "assistant":
                chat.append(assistant(msg["content"]))

        # User message with optional multimodal images (data URI format required by xAI)
        if image_items:
            contents = [user_text] + [
                xai_image(image_url=f"data:{img['mime_type']};base64,{img['data']}", detail="high")
                for img in image_items
            ]
            chat.append(user(*contents))
        else:
            chat.append(user(user_text))

        # Inject tool call + results from routing stage into reasoning context
        for msg in extra_messages:
            chat.append(msg)

        return chat

    # ── Custom tool dispatch ───────────────────────────────────────────────────

    async def _dispatch_tool(self, tool_call, request: ChatRequest) -> str:
        """Execute a local (custom) tool call and return a JSON result string."""
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)

        if name == "search_document":
            query = args.get("query", "")
            logger.info("search_document tool called with query: %s", query)
            context = await self._get_context(query, request.project_id, request.source_ids)
            result = context if context else "No relevant content found in the selected documents."
            return json.dumps({"result": result})

        return json.dumps({"error": f"Unknown tool: {name}"})

    # ── Chat (non-streaming) ──────────────────────────────────────────────────

    async def chat(self, request: ChatRequest) -> ChatResponse:
        history, user_text, image_items = await self._prepare_request(request)

        # MVP fast path: documents selected → always search, skip LLM routing entirely
        if request.source_ids and request.project_id:
            doc_context = await self._get_context(user_text, request.project_id, request.source_ids)
            extra_messages = []
        else:
            doc_context = None
            extra_messages = await self._route_tools(user_text, request)

        # Stage 2: single sample — reasoning model with full history + document context
        chat_obj = self._build_reasoning_chat(history, user_text, image_items, extra_messages, doc_context)
        response = await chat_obj.sample()

        ai_text = response.content
        u = response.usage
        input_tokens = getattr(u, "prompt_tokens", 0) or getattr(u, "input_tokens", 0)
        output_tokens = getattr(u, "completion_tokens", 0) or getattr(u, "output_tokens", 0)

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
        """
        history, user_text, image_items = await self._prepare_request(request)

        # MVP fast path: documents selected → always search, skip LLM routing entirely
        if request.source_ids and request.project_id:
            doc_context = await self._get_context(user_text, request.project_id, request.source_ids)
            extra_messages = []
        else:
            doc_context = None
            extra_messages = await self._route_tools(user_text, request)

        # Stage 2: stream final answer — reasoning model with full history + document context
        chat_obj = self._build_reasoning_chat(history, user_text, image_items, extra_messages, doc_context)

        full_text = ""
        final_response = None
        try:
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
        chat = self._client.chat.create(model=MODEL_ROUTER)
        chat.append(system(
            "Generate a short title (5-8 words) for a conversation based on the exchange below. "
            "Reply with ONLY the title — no punctuation, no quotes, no extra text."
        ))
        chat.append(user(f"User: {user_text[:300]}\nAssistant: {ai_text[:300]}"))
        response = await chat.sample()
        return response.content.strip()[:80]

    # ── RAG search (called by search_document tool handler) ───────────────────

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
