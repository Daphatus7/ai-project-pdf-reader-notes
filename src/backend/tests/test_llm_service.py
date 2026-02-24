"""
LLM Service Test Suite — 41 tests

Run: pytest src/backend/tests/test_llm_service.py -v

Sections:
  1.  Unit tests           — pure functions, no external deps        (tests  1-11)
  2.  Integration tests    — mocked Redis / Supabase / OpenAI        (tests 12-22)
  3.  Concurrency tests    — multi-user parallel access              (tests 23-27)
  4.  Security tests       — auth, quota, data isolation             (tests 28-31)
  5.  Edge case tests      — boundary conditions                     (tests 32-35)
  6.  Fault tolerance      — graceful degradation                    (tests 36-37)
  7.  Full-chain tests     — end-to-end LlmAgent.chat() flow         (tests 38-39)
  8.  Negative path tests  — failure and error propagation           (tests 40-41)
"""

import asyncio
import time
from typing import Any

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from langchain_core.messages import (
    AIMessage, HumanMessage, SystemMessage, ToolMessage,
)

from src.backend.schemas.chat.llm import ChatRequest
from src.backend.schemas.error import AppError
from src.backend.services.llm_service.conversation_storage import ConversationStorage
from src.backend.services.llm_service.llm_instance import (
    MAX_CHARS_PER_MSG,
    _build_human_message,
    _extract_text,
    _sanitize_text,
    _trim_messages_logic,   # pure function — no decorator unwrapping needed
    make_retriever_tool,
    LlmAgent,
)


# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_ai_message(
    content: str, input_tokens: int = 5, output_tokens: int = 10
) -> AIMessage:
    """Build an AIMessage with complete usage_metadata (all three fields required)."""
    return AIMessage(
        content=content,
        usage_metadata={
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
        },
    )


def _make_conv_storage(
    redis_has: bool, sb_has: bool, sb_messages: list | None = None
) -> tuple[ConversationStorage, MagicMock, MagicMock]:
    """Build a ConversationStorage backed by mocked Redis and Supabase.

    Returns (storage, mock_supabase, mock_redis) so callers can assert on mocks.
    """
    mock_redis = MagicMock()
    mock_redis.thread_exists_in_redis.return_value = redis_has

    mock_sb = MagicMock()
    mock_sb.thread_exists = AsyncMock(return_value=sb_has)
    mock_sb.load_recent_messages = AsyncMock(return_value=sb_messages or [])
    mock_sb.save_message = AsyncMock(
        return_value={"id": "msg-1", "role": "user", "created_at": "2026-01-01T00:00:00"}
    )

    storage = ConversationStorage(supabase_storage=mock_sb, redis_storage=mock_redis)
    return storage, mock_sb, mock_redis


def _make_agent(
    mock_create_agent: Any,
    mock_embeddings: Any,
    mock_openai: Any,
    user_responses: dict | None = None,
    invoke_delay: float = 0.0,
) -> tuple["LlmAgent", MagicMock]:
    """Construct a LlmAgent where agent.invoke is mocked per-user.

    invoke_delay: seconds of blocking sleep inside the mock (0 = instant).
    Returns (agent, mock_agent_obj).
    """

    def _invoke(messages: Any, config: Any) -> dict:
        if invoke_delay > 0:
            time.sleep(invoke_delay)  # Simulate blocking IO — runs in thread pool via run_in_executor
        uid = config["configurable"].get("user_id", "unknown")
        text = (user_responses or {}).get(uid, f"response-for-{uid}")
        return {"messages": [_make_ai_message(text)]}

    mock_agent_obj = MagicMock()
    mock_agent_obj.invoke = MagicMock(side_effect=_invoke)
    mock_agent_obj.update_state = MagicMock()
    mock_create_agent.return_value = mock_agent_obj

    mock_sb = MagicMock()
    mock_sb.get.return_value = MagicMock()
    mock_redis = MagicMock()
    mock_redis.checkpointer = MagicMock()

    # Replace storage layer with a clean mock to keep tests focused on the agent logic
    mock_conv = MagicMock()
    mock_conv.cold_start_load = AsyncMock(return_value=None)
    mock_conv.refresh_ttl = MagicMock()
    mock_conv.persist = AsyncMock(
        return_value={"id": "1", "role": "assistant", "created_at": "2026-01-01"}
    )

    agent = LlmAgent(
        checkpointer=mock_redis.checkpointer,
        supabase_storage=mock_sb,
        redis_storage=mock_redis,
    )
    agent._conversation_storage = mock_conv  # type: ignore[assignment]
    return agent, mock_agent_obj


def _get_tool_fn(tool: Any) -> Any:
    """Extract the underlying async coroutine from a LangChain @tool wrapper."""
    fn: Any = getattr(tool, "coroutine", None) or getattr(tool, "func", None)
    assert fn is not None and callable(fn), "Could not extract callable from tool"
    return fn


def _make_llm_test_client(
    llm_mock: Any, db_mock: Any, user_mock: Any | None = None
) -> TestClient:
    """Build a minimal FastAPI TestClient for the LLM router with overridden deps."""
    from src.backend.api.v1.llm import router
    from src.backend.api.deps import get_llm_service, get_database_service, get_user

    app = FastAPI()
    app.include_router(router)

    @app.exception_handler(AppError)
    async def _handle_app_error(request: Any, exc: AppError) -> JSONResponse:  # noqa: ARG001
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    app.dependency_overrides[get_llm_service] = lambda: llm_mock
    app.dependency_overrides[get_database_service] = lambda: db_mock
    if user_mock is not None:
        app.dependency_overrides[get_user] = lambda: user_mock

    return TestClient(app, raise_server_exceptions=False)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 — Unit tests: pure functions  (tests 1-11)
# ─────────────────────────────────────────────────────────────────────────────

class TestExtractText:
    """Tests 1-4: _extract_text() handles both content formats."""

    def test_1_string_content(self) -> None:
        """Plain string content returns the string."""
        assert _extract_text({"content": "hello"}) == "hello"

    def test_2_list_text_block(self) -> None:
        """List content with a text block returns the text."""
        assert _extract_text({"content": [{"type": "text", "text": "hi"}]}) == "hi"

    def test_3_none_content_returns_none(self) -> None:
        """None content returns None."""
        assert _extract_text({"content": None}) is None

    def test_4_no_text_block_returns_none(self) -> None:
        """List content with only an image block returns None."""
        result = _extract_text({"content": [{"type": "image_url", "image_url": {}}]})
        assert result is None


class TestSanitizeText:
    """Tests 5-6: _sanitize_text() truncation and NUL removal."""

    def test_5_truncate_over_limit(self) -> None:
        """Text exceeding MAX_CHARS_PER_MSG is truncated with a marker suffix."""
        long = "a" * (MAX_CHARS_PER_MSG + 500)
        result = _sanitize_text(long)
        assert result.endswith("…(truncated)")
        assert len(result) <= MAX_CHARS_PER_MSG + len("…(truncated)")

    def test_6_remove_nul_character(self) -> None:
        """NUL bytes are stripped from the text."""
        result = _sanitize_text("hello\x00world")
        assert "\x00" not in result
        assert "helloworld" in result


class TestTrimMessages:
    """Tests 7-9: _trim_messages_logic() context-window trimming.

    Tests call _trim_messages_logic directly — no decorator unwrapping needed.
    """

    def _call(self, messages: list) -> Any:
        """Call the pure trim logic directly."""
        return _trim_messages_logic(messages)

    def test_7_under_limit_no_change(self) -> None:
        """Fewer than max messages → returns None (no trimming needed)."""
        msgs = [SystemMessage(content="sys"), HumanMessage(content="q"), AIMessage(content="a")]
        assert self._call(msgs) is None

    def test_8_over_limit_removes_old_messages(self) -> None:
        """More than max messages → a trimmed message list is returned."""
        msgs = [SystemMessage(content="sys")] + [
            HumanMessage(content=f"q{i}") if i % 2 == 0 else AIMessage(content=f"a{i}")
            for i in range(6)
        ]
        result = self._call(msgs)
        assert result is not None
        assert len(result["messages"]) < len(msgs)

    def test_9_preserves_tool_call_pair(self) -> None:
        """_trim_messages_logic never splits an AIMessage(tool_call) / ToolMessage pair."""
        system = SystemMessage(content="sys")
        human1 = HumanMessage(content="q1")
        ai_tool = AIMessage(
            content="",
            tool_calls=[{"id": "call_1", "name": "tool", "args": {}}],
        )
        tool_resp = ToolMessage(content="result", tool_call_id="call_1")
        human2 = HumanMessage(content="q2")
        ai_final = AIMessage(content="done")

        result = self._call([system, human1, ai_tool, tool_resp, human2, ai_final])

        if result is None:
            return  # No trimming occurred — pair is intact by definition

        kept: list = result["messages"]
        for i, m in enumerate(kept):
            if isinstance(m, AIMessage) and getattr(m, "tool_calls", []):
                assert i + 1 < len(kept) and isinstance(kept[i + 1], ToolMessage), (
                    "tool_call AIMessage must be immediately followed by its ToolMessage"
                )


class TestBuildHumanMessage:
    """Tests 10-11: _build_human_message() content assembly."""

    def test_10_text_content(self) -> None:
        """Text item produces a HumanMessage containing a text part."""
        msg = _build_human_message([{"type": "text", "text": "hello"}])
        assert isinstance(msg, HumanMessage)
        texts = [p["text"] for p in msg.content if isinstance(p, dict) and p.get("type") == "text"]
        assert "hello" in texts

    def test_11_image_content_data_url(self) -> None:
        """Image item produces a HumanMessage with a correctly formatted data URL."""
        msg = _build_human_message([{"type": "image", "mime_type": "image/png", "data": "abc123"}])
        assert isinstance(msg, HumanMessage)
        image_part = next(
            (p for p in msg.content if isinstance(p, dict) and p.get("type") == "image_url"),
            None,
        )
        assert image_part is not None
        assert "data:image/png;base64,abc123" in image_part["image_url"]["url"]


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — Integration tests: mocked dependencies  (tests 12-22)
# ─────────────────────────────────────────────────────────────────────────────

class TestColdStartLoad:
    """Tests 12-15: ConversationStorage.cold_start_load() branching logic."""

    @pytest.mark.asyncio
    async def test_12_skip_if_in_redis(self) -> None:
        """Thread found in Redis → returns None without querying Supabase."""
        storage, mock_sb, _ = _make_conv_storage(redis_has=True, sb_has=True)
        result = await storage.cold_start_load("thread-1")
        assert result is None
        mock_sb.thread_exists.assert_not_called()  # type: ignore[union-attr]

    @pytest.mark.asyncio
    async def test_13_new_thread_returns_none(self) -> None:
        """Thread absent from both Redis and Supabase → None (fresh conversation)."""
        storage, _, _ = _make_conv_storage(redis_has=False, sb_has=False)
        assert await storage.cold_start_load("new-thread") is None

    @pytest.mark.asyncio
    async def test_14_loads_history_from_supabase(self) -> None:
        """Thread missing from Redis but present in Supabase → history returned."""
        msgs = [
            {"role": "user", "content": [{"type": "text", "text": "hi"}]},
            {"role": "assistant", "content": [{"type": "text", "text": "hello"}]},
        ]
        storage, _, _ = _make_conv_storage(redis_has=False, sb_has=True, sb_messages=msgs)
        assert await storage.cold_start_load("thread-old") == msgs

    @pytest.mark.asyncio
    async def test_15_returns_all_messages_for_chat_to_trim(self) -> None:
        """cold_start_load returns all messages; the 50-message cap is applied in chat()."""
        msgs = [{"role": "user", "content": [{"type": "text", "text": f"m{i}"}]} for i in range(60)]
        storage, _, _ = _make_conv_storage(redis_has=False, sb_has=True, sb_messages=msgs)
        assert await storage.cold_start_load("thread-big") == msgs


class TestPersist:
    """Tests 16-17: ConversationStorage.persist() write path."""

    @pytest.mark.asyncio
    async def test_16_saves_message_with_correct_args(self) -> None:
        """persist() forwards all arguments verbatim to supabase.save_message."""
        storage, mock_sb, _ = _make_conv_storage(redis_has=False, sb_has=False)
        await storage.persist(
            user_id="u1", thread_id="t1", role="user",
            content=[{"type": "text", "text": "hello"}], token_count=10,
        )
        mock_sb.save_message.assert_called_once_with(  # type: ignore[union-attr]
            user_id="u1", thread_id="t1", role="user",
            content=[{"type": "text", "text": "hello"}], token_count=10,
        )

    @pytest.mark.asyncio
    async def test_17_supabase_failure_returns_none_no_crash(self) -> None:
        """Supabase write error → persist() logs gracefully and returns None."""
        storage, mock_sb, _ = _make_conv_storage(redis_has=False, sb_has=False)
        mock_sb.save_message = AsyncMock(side_effect=Exception("DB timeout"))  # type: ignore[union-attr]
        result = await storage.persist(
            user_id="u1", thread_id="t1", role="user",
            content=[{"type": "text", "text": "hello"}],
        )
        assert result is None


class TestRetrieverTool:
    """Tests 18-21: make_retriever_tool() user filtering and safety."""

    def _make_tool(self, response_data: list | None = None) -> tuple[Any, MagicMock, MagicMock]:
        """Build the retriever tool with mocked Supabase and embedding model."""
        mock_sb = MagicMock()
        mock_sb.rpc.return_value.execute.return_value = MagicMock(data=response_data or [])
        mock_emb = MagicMock()
        mock_emb.embed_query.return_value = [0.1, 0.2, 0.3]
        return make_retriever_tool(mock_sb, mock_emb), mock_sb, mock_emb

    @pytest.mark.asyncio
    async def test_18_passes_user_id_to_rpc(self) -> None:
        """user_id from config is forwarded to the Supabase RPC filter_user_id."""
        tool, mock_sb, _ = self._make_tool()
        config = {"configurable": {"user_id": "user-abc", "project_id": None, "source_ids": None}}
        await _get_tool_fn(tool)(query="test", config=config)
        assert mock_sb.rpc.call_args[0][1]["filter_user_id"] == "user-abc"

    @pytest.mark.asyncio
    async def test_19_passes_project_id_to_rpc(self) -> None:
        """project_id from config is forwarded to the Supabase RPC filter_project_id."""
        tool, mock_sb, _ = self._make_tool()
        config = {"configurable": {"user_id": "u1", "project_id": "proj-xyz", "source_ids": None}}
        await _get_tool_fn(tool)(query="test", config=config)
        assert mock_sb.rpc.call_args[0][1]["filter_project_id"] == "proj-xyz"

    @pytest.mark.asyncio
    async def test_20_none_user_id_does_not_crash(self) -> None:
        """None user_id is forwarded without raising an exception."""
        tool, _, _ = self._make_tool()
        config = {"configurable": {"user_id": None, "project_id": None, "source_ids": None}}
        docs, sources = await _get_tool_fn(tool)(query="test", config=config)
        assert isinstance(docs, list)
        assert isinstance(sources, list)

    @pytest.mark.asyncio
    async def test_21_empty_rpc_result_returns_empty_lists(self) -> None:
        """Supabase returning no rows → ([], []) without crashing."""
        tool, _, _ = self._make_tool(response_data=[])
        config = {"configurable": {"user_id": "u1", "project_id": "p1", "source_ids": None}}
        docs, sources = await _get_tool_fn(tool)(query="nothing here", config=config)
        assert docs == [] and sources == []


class TestChatConfigBuilding:
    """Test 22: chat() injects full user context into RunnableConfig."""

    @pytest.mark.asyncio
    @patch("src.backend.services.llm_service.llm_instance.ChatOpenAI")
    @patch("src.backend.services.llm_service.llm_instance.OpenAIEmbeddings")
    @patch("src.backend.services.llm_service.llm_instance.create_agent")
    async def test_22_config_has_all_fields(
        self, mock_create_agent: Any, _emb: Any, _oai: Any
    ) -> None:
        """agent.invoke receives config with thread_id, user_id, project_id, source_ids."""
        captured: list[dict] = []

        def _invoke(messages: Any, config: Any) -> dict:
            captured.append(config)
            return {"messages": [_make_ai_message("ok")]}

        agent, mock_agent_obj = _make_agent(mock_create_agent, _emb, _oai)
        mock_agent_obj.invoke = MagicMock(side_effect=_invoke)

        await agent.chat(
            ChatRequest(
                user_id="u-123", project_id="p-456", thread_id="t-789",
                content=[{"type": "text", "text": "hi"}],
                source_ids=["doc-1"],
            )
        )

        assert captured, "agent.invoke was never called"
        cfg = captured[0]["configurable"]
        assert cfg["thread_id"] == "t-789"
        assert cfg["user_id"] == "u-123"
        assert cfg["project_id"] == "p-456"
        assert cfg["source_ids"] == ["doc-1"]


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 — Concurrency tests  (tests 23-27)
# ─────────────────────────────────────────────────────────────────────────────

class TestConcurrency:
    """Tests 23-27: multiple users sending requests in parallel."""

    @pytest.mark.asyncio
    @patch("src.backend.services.llm_service.llm_instance.ChatOpenAI")
    @patch("src.backend.services.llm_service.llm_instance.OpenAIEmbeddings")
    @patch("src.backend.services.llm_service.llm_instance.create_agent")
    async def test_23_two_users_no_data_leak(
        self, mock_ca: Any, _emb: Any, _oai: Any
    ) -> None:
        """User A and User B get distinct responses; no cross-contamination."""
        agent, _ = _make_agent(
            mock_ca, _emb, _oai,
            user_responses={"user-A": "secret-A-only", "user-B": "secret-B-only"},
        )

        req_a = ChatRequest(user_id="user-A", thread_id="t-A", project_id="p1",
                            content=[{"type": "text", "text": "hi"}])
        req_b = ChatRequest(user_id="user-B", thread_id="t-B", project_id="p1",
                            content=[{"type": "text", "text": "hi"}])

        resp_a, resp_b = await asyncio.gather(agent.chat(req_a), agent.chat(req_b))

        text_a: str = resp_a.content[0]["text"]
        text_b: str = resp_b.content[0]["text"]

        assert "secret-A-only" in text_a and "secret-B-only" not in text_a
        assert "secret-B-only" in text_b and "secret-A-only" not in text_b

    @pytest.mark.asyncio
    @patch("src.backend.services.llm_service.llm_instance.ChatOpenAI")
    @patch("src.backend.services.llm_service.llm_instance.OpenAIEmbeddings")
    @patch("src.backend.services.llm_service.llm_instance.create_agent")
    async def test_24_concurrent_requests_all_succeed(
        self, mock_ca: Any, _emb: Any, _oai: Any
    ) -> None:
        """10 concurrent requests all succeed — zero failures expected with a healthy mock."""
        agent, _ = _make_agent(mock_ca, _emb, _oai)

        reqs = [
            ChatRequest(user_id=f"u{i}", thread_id=f"t{i}", project_id="p1",
                        content=[{"type": "text", "text": "hello"}])
            for i in range(10)
        ]
        results = await asyncio.gather(*[agent.chat(r) for r in reqs], return_exceptions=True)
        errors = [r for r in results if isinstance(r, Exception)]
        assert not errors, f"All requests should succeed; got errors: {errors}"

    @pytest.mark.asyncio
    @patch("src.backend.services.llm_service.llm_instance.ChatOpenAI")
    @patch("src.backend.services.llm_service.llm_instance.OpenAIEmbeddings")
    @patch("src.backend.services.llm_service.llm_instance.create_agent")
    async def test_25_blocking_calls_run_in_parallel_not_sequentially(
        self, mock_ca: Any, _emb: Any, _oai: Any
    ) -> None:
        """run_in_executor genuinely parallelises blocking IO: N×50ms tasks finish in ~50ms."""
        DELAY = 0.05   # Each invoke blocks the thread for 50 ms
        N = 5

        # invoke_delay causes time.sleep inside the mock — runs in thread pool
        agent, _ = _make_agent(mock_ca, _emb, _oai, invoke_delay=DELAY)

        reqs = [
            ChatRequest(user_id=f"u{i}", thread_id=f"t{i}", project_id="p1",
                        content=[{"type": "text", "text": "hi"}])
            for i in range(N)
        ]

        start = time.perf_counter()
        results = await asyncio.gather(*[agent.chat(r) for r in reqs], return_exceptions=True)
        elapsed = time.perf_counter() - start

        errors = [r for r in results if isinstance(r, Exception)]
        assert not errors, f"Unexpected errors: {errors}"

        # Sequential would take N × DELAY = 250 ms; parallel should be ~50 ms.
        # Allow generous 3× overhead — still well under half the sequential budget.
        sequential_budget = N * DELAY
        assert elapsed < sequential_budget / 2, (
            f"Requests appear sequential: elapsed={elapsed:.3f}s, "
            f"sequential_budget/2={sequential_budget/2:.3f}s"
        )

    @pytest.mark.asyncio
    @patch("src.backend.services.llm_service.llm_instance.ChatOpenAI")
    @patch("src.backend.services.llm_service.llm_instance.OpenAIEmbeddings")
    @patch("src.backend.services.llm_service.llm_instance.create_agent")
    async def test_26_same_user_two_threads_both_answered(
        self, mock_ca: Any, _emb: Any, _oai: Any
    ) -> None:
        """Same user, two different thread IDs → both requests complete successfully."""
        agent, _ = _make_agent(mock_ca, _emb, _oai)

        req1 = ChatRequest(user_id="u-X", thread_id="t-1", project_id="p1",
                           content=[{"type": "text", "text": "msg1"}])
        req2 = ChatRequest(user_id="u-X", thread_id="t-2", project_id="p1",
                           content=[{"type": "text", "text": "msg2"}])

        resp1, resp2 = await asyncio.gather(agent.chat(req1), agent.chat(req2))
        assert resp1 is not None and resp2 is not None

    @pytest.mark.asyncio
    @patch("src.backend.services.llm_service.llm_instance.ChatOpenAI")
    @patch("src.backend.services.llm_service.llm_instance.OpenAIEmbeddings")
    @patch("src.backend.services.llm_service.llm_instance.create_agent")
    async def test_27_each_request_uses_own_thread_id(
        self, mock_ca: Any, _emb: Any, _oai: Any
    ) -> None:
        """agent.invoke is called with the requesting user's thread_id, never another user's."""
        captured_threads: list[str] = []

        def _invoke(messages: Any, config: Any) -> dict:
            captured_threads.append(config["configurable"]["thread_id"])
            return {"messages": [_make_ai_message("ok", 2, 2)]}

        agent, mock_agent_obj = _make_agent(mock_ca, _emb, _oai)
        mock_agent_obj.invoke = MagicMock(side_effect=_invoke)

        req_a = ChatRequest(user_id="A", thread_id="THREAD-A", project_id="p1",
                            content=[{"type": "text", "text": "hi"}])
        req_b = ChatRequest(user_id="B", thread_id="THREAD-B", project_id="p1",
                            content=[{"type": "text", "text": "hi"}])

        await asyncio.gather(agent.chat(req_a), agent.chat(req_b))

        assert "THREAD-A" in captured_threads
        assert "THREAD-B" in captured_threads


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 — Security tests  (tests 28-31)
# ─────────────────────────────────────────────────────────────────────────────

class TestSecurity:
    """Tests 28-31: authentication, quota enforcement, and data isolation."""

    def _make_client_no_auth_override(self) -> TestClient:
        """Build a client where get_user is NOT overridden (real auth middleware runs)."""
        from src.backend.api.v1.llm import router
        from src.backend.api.deps import get_llm_service, get_database_service

        app = FastAPI()
        app.include_router(router)

        @app.exception_handler(AppError)
        async def _handle(req: Any, exc: AppError) -> JSONResponse:  # noqa: ARG001
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

        app.dependency_overrides[get_llm_service] = lambda: MagicMock()
        app.dependency_overrides[get_database_service] = lambda: MagicMock()
        return TestClient(app, raise_server_exceptions=False)

    def test_28_no_auth_token_returns_401_403_or_422(self) -> None:
        """Request without Authorization header → 401, 403, or 422."""
        client = self._make_client_no_auth_override()
        resp = client.post(
            "/llm/chat",
            json={"thread_id": "t1", "content": [{"type": "text", "text": "hi"}]},
        )
        assert resp.status_code in (401, 403, 422)

    def test_29_invalid_jwt_returns_401_or_403(self) -> None:
        """Request with a malformed JWT is rejected with 401 or 403."""
        client = self._make_client_no_auth_override()
        resp = client.post(
            "/llm/chat",
            headers={"Authorization": "Bearer this.is.not.valid"},
            json={"thread_id": "t1", "content": [{"type": "text", "text": "hi"}]},
        )
        assert resp.status_code in (401, 403)

    def test_30_token_quota_exceeded_returns_429(self) -> None:
        """User over token quota → HTTP 429 is returned before LLM is called."""
        llm_mock = AsyncMock()
        db_mock = MagicMock()
        db_mock.enforce_token_quota = AsyncMock(
            side_effect=AppError(429, "QUOTA_EXCEEDED", "Token quota exceeded")
        )
        db_mock.track_token_usage = AsyncMock()

        client = _make_llm_test_client(llm_mock, db_mock, user_mock={"sub": "over-quota"})
        resp = client.post(
            "/llm/chat",
            json={"thread_id": "t1", "content": [{"type": "text", "text": "hi"}]},
        )
        assert resp.status_code == 429
        llm_mock.chat.assert_not_called()

    def test_31_thread_id_from_request_reaches_llm_service(self) -> None:
        """LLM service receives the exact thread_id sent in the request body."""
        captured: list[str] = []

        async def _chat(request: ChatRequest) -> Any:
            captured.append(request.thread_id)
            return MagicMock(
                id="1", role="assistant",
                content=[{"type": "text", "text": "ok"}],
                created_at="2026-01-01", total_tokens=5,
            )

        llm_mock = MagicMock()
        llm_mock.chat = _chat
        db_mock = MagicMock()
        db_mock.enforce_token_quota = AsyncMock()
        db_mock.track_token_usage = AsyncMock()

        client = _make_llm_test_client(llm_mock, db_mock, user_mock={"sub": "user-1"})
        client.post(
            "/llm/chat",
            json={"thread_id": "THREAD-XYZ", "content": [{"type": "text", "text": "hi"}]},
        )
        assert "THREAD-XYZ" in captured


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 — Edge case tests  (tests 32-35)
# ─────────────────────────────────────────────────────────────────────────────

class TestEdgeCases:
    """Tests 32-35: boundary conditions and unusual inputs."""

    def test_32_oversized_message_is_truncated(self) -> None:
        """A 10 000-char message is truncated and ends with the truncation marker."""
        result = _sanitize_text("x" * 10_000)
        assert result.endswith("…(truncated)")
        assert len(result) <= MAX_CHARS_PER_MSG + len("…(truncated)")

    def test_33_empty_content_list_builds_empty_message(self) -> None:
        """An empty content list produces a HumanMessage with no content parts."""
        msg = _build_human_message([])
        assert isinstance(msg, HumanMessage)
        assert msg.content == []

    @pytest.mark.asyncio
    async def test_34_unknown_thread_id_treated_as_new_conversation(self) -> None:
        """A non-existent thread_id is treated as a new conversation without crashing."""
        storage, _, _ = _make_conv_storage(redis_has=False, sb_has=False)
        assert await storage.cold_start_load("does-not-exist-xyz") is None

    @pytest.mark.asyncio
    async def test_35_source_ids_empty_list_passes_through(self) -> None:
        """source_ids=[] is forwarded to Supabase RPC (not silently converted to None)."""
        mock_sb = MagicMock()
        mock_sb.rpc.return_value.execute.return_value = MagicMock(data=[])
        mock_emb = MagicMock()
        mock_emb.embed_query.return_value = [0.1, 0.2]

        tool = make_retriever_tool(mock_sb, mock_emb)
        config = {"configurable": {"user_id": "u1", "project_id": "p1", "source_ids": []}}

        docs, sources = await _get_tool_fn(tool)(query="test", config=config)

        assert docs == [] and sources == []
        assert mock_sb.rpc.call_args[0][1]["filter_source_ids"] == []


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6 — Fault tolerance tests  (tests 36-37)
# ─────────────────────────────────────────────────────────────────────────────

class TestFaultTolerance:
    """Tests 36-37: graceful degradation when external services fail."""

    @pytest.mark.asyncio
    async def test_36_redis_error_does_not_propagate_from_cold_start(self) -> None:
        """Redis connection failure during cold_start_load does not crash the caller."""
        mock_redis = MagicMock()
        mock_redis.thread_exists_in_redis.side_effect = Exception("Redis connection refused")

        mock_sb = MagicMock()
        mock_sb.thread_exists = AsyncMock(return_value=True)
        mock_sb.load_recent_messages = AsyncMock(return_value=[])

        storage = ConversationStorage(supabase_storage=mock_sb, redis_storage=mock_redis)

        try:
            await storage.cold_start_load("thread-1")
        except Exception as exc:  # noqa: BLE001
            pytest.fail(f"Redis failure leaked out of cold_start_load: {exc}")

    @pytest.mark.asyncio
    async def test_37_supabase_persist_failure_returns_none(self) -> None:
        """Supabase timeout in persist() → returns None without raising."""
        storage, mock_sb, _ = _make_conv_storage(redis_has=False, sb_has=False)
        mock_sb.save_message = AsyncMock(side_effect=Exception("Supabase timeout"))  # type: ignore[union-attr]

        result = await storage.persist(
            user_id="u1", thread_id="t1", role="assistant",
            content=[{"type": "text", "text": "response"}], token_count=50,
        )
        assert result is None


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7 — Full-chain integration tests  (tests 38-39)
# ─────────────────────────────────────────────────────────────────────────────

class TestFullChain:
    """Tests 38-39: LlmAgent.chat() end-to-end with real ConversationStorage.

    These tests do NOT replace agent._conversation_storage.
    The complete call chain (cold_start_load → update_state → invoke → persist)
    is exercised so that any integration regression is caught.
    """

    def _build_storage_mocks(
        self,
        redis_has: bool = False,
        sb_has: bool = False,
        history: list | None = None,
    ) -> tuple[MagicMock, MagicMock]:
        """Build SupabaseStorage and RedisStorage mock objects for LlmAgent.__init__."""
        # SupabaseStorage service mock — exposes async methods used by ConversationStorage
        mock_sb = MagicMock()
        mock_sb.get.return_value = MagicMock()           # Supabase client for RAG tool
        mock_sb.thread_exists = AsyncMock(return_value=sb_has)
        mock_sb.load_recent_messages = AsyncMock(return_value=history or [])
        mock_sb.save_message = AsyncMock(
            return_value={"id": "resp-1", "role": "assistant", "created_at": "2026-01-01"}
        )

        # RedisStorage service mock — exposes sync methods used by ConversationStorage
        mock_redis = MagicMock()
        mock_redis.checkpointer = MagicMock()
        mock_redis.thread_exists_in_redis.return_value = redis_has

        return mock_sb, mock_redis

    @pytest.mark.asyncio
    @patch("src.backend.services.llm_service.llm_instance.ChatOpenAI")
    @patch("src.backend.services.llm_service.llm_instance.OpenAIEmbeddings")
    @patch("src.backend.services.llm_service.llm_instance.create_agent")
    async def test_38_cold_start_chain_all_components_called(
        self, mock_ca: Any, _emb: Any, _oai: Any
    ) -> None:
        """Cold start: history loaded from Supabase, injected via update_state, then persisted."""
        history = [{"role": "user", "content": [{"type": "text", "text": "prev question"}]}]
        mock_sb, mock_redis = self._build_storage_mocks(
            redis_has=False, sb_has=True, history=history
        )

        mock_agent_obj = MagicMock()
        mock_agent_obj.invoke = MagicMock(
            return_value={"messages": [_make_ai_message("AI reply")]}
        )
        mock_agent_obj.update_state = MagicMock()
        mock_ca.return_value = mock_agent_obj

        # Create agent WITHOUT replacing _conversation_storage
        agent = LlmAgent(
            checkpointer=mock_redis.checkpointer,
            supabase_storage=mock_sb,
            redis_storage=mock_redis,
        )

        await agent.chat(ChatRequest(
            user_id="u1", project_id="p1", thread_id="t1",
            content=[{"type": "text", "text": "hello"}],
        ))

        # Verify every stage of the call chain fired
        mock_sb.thread_exists.assert_called_once_with("t1")         # cold start check
        mock_sb.load_recent_messages.assert_called_once_with("t1")  # history fetched
        mock_agent_obj.update_state.assert_called_once()             # history injected
        mock_agent_obj.invoke.assert_called_once()                   # LLM invoked
        assert mock_sb.save_message.call_count == 2                  # user + AI persisted

    @pytest.mark.asyncio
    @patch("src.backend.services.llm_service.llm_instance.ChatOpenAI")
    @patch("src.backend.services.llm_service.llm_instance.OpenAIEmbeddings")
    @patch("src.backend.services.llm_service.llm_instance.create_agent")
    async def test_39_hot_start_skips_supabase_load(
        self, mock_ca: Any, _emb: Any, _oai: Any
    ) -> None:
        """Hot start (thread in Redis): Supabase load is skipped, invoke and persist still run."""
        mock_sb, mock_redis = self._build_storage_mocks(redis_has=True, sb_has=True)

        mock_agent_obj = MagicMock()
        mock_agent_obj.invoke = MagicMock(
            return_value={"messages": [_make_ai_message("pong")]}
        )
        mock_agent_obj.update_state = MagicMock()
        mock_ca.return_value = mock_agent_obj

        agent = LlmAgent(
            checkpointer=mock_redis.checkpointer,
            supabase_storage=mock_sb,
            redis_storage=mock_redis,
        )

        await agent.chat(ChatRequest(
            user_id="u1", project_id="p1", thread_id="t1",
            content=[{"type": "text", "text": "ping"}],
        ))

        # Thread was in Redis → no cold start, no history injection
        mock_sb.load_recent_messages.assert_not_called()
        mock_agent_obj.update_state.assert_not_called()

        # But the normal invoke + persist path still runs
        mock_agent_obj.invoke.assert_called_once()
        assert mock_sb.save_message.call_count == 2


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8 — Negative path tests  (tests 40-41)
# ─────────────────────────────────────────────────────────────────────────────

class TestNegativePaths:
    """Tests 40-41: error propagation and token count correctness."""

    @pytest.mark.asyncio
    @patch("src.backend.services.llm_service.llm_instance.ChatOpenAI")
    @patch("src.backend.services.llm_service.llm_instance.OpenAIEmbeddings")
    @patch("src.backend.services.llm_service.llm_instance.create_agent")
    async def test_40_invoke_exception_propagates_out_of_chat(
        self, mock_ca: Any, _emb: Any, _oai: Any
    ) -> None:
        """If agent.invoke raises, the exception is not swallowed — it propagates out of chat()."""
        agent, mock_agent_obj = _make_agent(mock_ca, _emb, _oai)
        mock_agent_obj.invoke = MagicMock(side_effect=RuntimeError("LLM timeout"))

        with pytest.raises(RuntimeError, match="LLM timeout"):
            await agent.chat(ChatRequest(
                user_id="u1", thread_id="t1", project_id="p1",
                content=[{"type": "text", "text": "hi"}],
            ))

    @pytest.mark.asyncio
    @patch("src.backend.services.llm_service.llm_instance.ChatOpenAI")
    @patch("src.backend.services.llm_service.llm_instance.OpenAIEmbeddings")
    @patch("src.backend.services.llm_service.llm_instance.create_agent")
    async def test_41_total_tokens_equals_input_plus_output(
        self, mock_ca: Any, _emb: Any, _oai: Any
    ) -> None:
        """ChatResponse.total_tokens == input_tokens + output_tokens from usage_metadata."""
        def _invoke(messages: Any, config: Any) -> dict:
            return {"messages": [_make_ai_message("ok", input_tokens=7, output_tokens=13)]}

        agent, mock_agent_obj = _make_agent(mock_ca, _emb, _oai)
        mock_agent_obj.invoke = MagicMock(side_effect=_invoke)

        resp = await agent.chat(ChatRequest(
            user_id="u1", thread_id="t1", project_id="p1",
            content=[{"type": "text", "text": "hi"}],
        ))

        assert resp.total_tokens == 20  # 7 input + 13 output
