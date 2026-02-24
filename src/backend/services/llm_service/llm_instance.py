import logging
from typing import Any, TYPE_CHECKING
from langchain.agents import create_agent, AgentState
from langchain.agents.middleware import before_model
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool, InjectedToolArg
from typing import Annotated
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langgraph.graph.message import REMOVE_ALL_MESSAGES
from langgraph.runtime import Runtime
from supabase import Client

from src.backend.schemas import ChatRequest, ChatResponse
from langgraph.checkpoint.base import BaseCheckpointSaver
from langchain.messages import RemoveMessage

from src.backend.services.llm_service.conversation_storage import ConversationStorage

if TYPE_CHECKING:
    from src.backend.services.storage.supabase_storage import SupabaseStorage
    from src.backend.services.storage.redis_storage import RedisStorage


import logging
from typing import Any, Optional, Sequence

from langchain_core.messages import AIMessage, HumanMessage, BaseMessage

logger = logging.getLogger(__name__)

SUPPORTED_ROLES = {"assistant", "user"}

MAX_MESSAGES = 50          # 总历史条数上限（按你业务调）
MAX_CHARS_PER_MSG = 4000   # 单条消息最大字符数（按你业务调）

def _extract_text(msg: dict[str, Any]) -> Optional[str]:
    """
    支持两类常见结构：
    1) msg["content"] = [{"type":"text","text":"..."}, ...]
    2) msg["content"] = "..."
    解析不到就返回 None。
    """
    content = msg.get("content")

    if isinstance(content, str):
        text = content.strip()
        return text or None

    if isinstance(content, Sequence) and not isinstance(content, (str, bytes)):
        # 找第一段 type=text 且有 text 的 block
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text" and isinstance(block.get("text"), str):
                    text = block["text"].strip()
                    return text or None
        return None

    return None

def _sanitize_text(text: str) -> str:
    # 1) 基础清理
    text = text.replace("\x00", "")  # 去掉 NUL
    text = text.strip()

    # 2) 截断，避免 token/内存爆炸
    if len(text) > MAX_CHARS_PER_MSG:
        text = text[:MAX_CHARS_PER_MSG] + "…(truncated)"
    return text

def _to_lc_message(role: str, text: str) -> BaseMessage:
    if role == "assistant":
        return AIMessage(content=text)
    return HumanMessage(content=text)

STRUCTURED_OUTPUT_SYSTEM_PROMPT = """You are a helpful assistant. Keep responses concise.
  Use markdown formatting. Wrap all math expressions in $...$ delimiters
  using LaTeX commands (e.g. $\\sum$, $\\omega$), never Unicode math symbols.
  In tables, use $\\lvert x \\rvert$ instead of $|x|$."""

def _parse_ai_response(ai_msg) -> list[dict]:
    """Parse AI message into structured output contents.

    Converts OpenAI response format to our OutputContent structure.
    Supports text and image outputs for multimodal responses.
    """
    contents = []

    if isinstance(ai_msg.content, str):
        # Simple text response
        contents.append({"type": "text", "text": ai_msg.content})
    elif isinstance(ai_msg.content, list):
        # Multimodal response (OpenAI format)
        for item in ai_msg.content:
            if isinstance(item, dict):
                if item.get("type") == "text":
                    contents.append({"type": "text", "text": item["text"]})
                elif item.get("type") == "image_url":
                    # Extract base64 from data URL
                    url = item["image_url"]["url"]
                    if url.startswith("data:"):
                        parts = url.split(";base64,", 1)
                        if len(parts) == 2:
                            mime_type = parts[0].replace("data:", "")
                            data = parts[1]
                            contents.append({
                                "type": "image",
                                "data": data,
                                "mime_type": mime_type
                            })
            elif hasattr(item, "text"):
                # LangChain text content object
                contents.append({"type": "text", "text": item.text})
    else:
        # Fallback: convert to string
        contents.append({"type": "text", "text": str(ai_msg.content)})

    return contents


def _build_human_message(contents: list) -> HumanMessage:
    """Build HumanMessage from request contents."""
    logging.info(contents)
    content_parts = []
    for item in contents:
        if item.get('type') == "text":
            content_parts.append({"type": "text", "text": item['text']})
        elif item.get('type') == "image":
            data_url = f"data:{item['mime_type']};base64,{item['data']}"
            content_parts.append({"type": "image_url", "image_url": {"url": data_url}})
    return HumanMessage(content=content_parts)

def delete_messages(state):
    messages = state["messages"]
    if len(messages) > 2:
        # remove the earliest two messages
        return {"messages": [RemoveMessage(id=m.id) for m in messages[:2]]}
    return None

@before_model
def log_state(state: AgentState, runtime: Runtime) -> None:
    """Log the agent state before model invocation."""
    print("Agent State Before Model Call:")
    for key, value in state.items():
        print(f"{key}: {value}")
    return None

@before_model
def trim_messages(state: AgentState, runtime: Runtime) -> dict[str, Any] | None:
    """Keep only the last few messages to fit context window.

    IMPORTANT: Preserves tool_calls and tool response pairs to avoid OpenAI API errors.
    """
    messages = state["messages"]
    max_messages = 3  # Keep last N messages (adjustable)

    if len(messages) <= max_messages:
        return None  # No changes needed

    first_msg = messages[0]  # Keep system message

    # Find a safe cut point that doesn't break tool call pairs
    # Start from where we want to cut and move forward until we find a safe point
    cut_index = len(messages) - max_messages

    # Move cut_index forward if it would split a tool call sequence
    while cut_index < len(messages) - 1:
        msg = messages[cut_index]
        # Check if this message is a tool response (ToolMessage)
        # If so, we need to include the preceding AIMessage with tool_calls
        if msg.__class__.__name__ == "ToolMessage":
            cut_index -= 1
            continue
        # Check if previous message has tool_calls that we'd be cutting off
        if cut_index > 0:
            prev_msg = messages[cut_index - 1]
            if hasattr(prev_msg, "tool_calls") and prev_msg.tool_calls:
                # Previous message has tool_calls, check if current is its response
                cut_index += 1
                continue
        break

    # Ensure we don't cut too much
    if cut_index >= len(messages) - 2:
        return None  # Not safe to trim

    recent_messages = messages[cut_index:]
    new_messages = [first_msg] + list(recent_messages)

    return {
        "messages": [
            RemoveMessage(id=REMOVE_ALL_MESSAGES),
            *new_messages
        ]
    }

def _should_send_structured_update(chunk_count: int, text: str) -> bool:
    """Check if we should send a structured update."""
    return (chunk_count % 15 == 0 and len(text) > 50) or len(text) > 300

def make_retriever_tool(supabase: Client, embedding_model: OpenAIEmbeddings):
    """Create retriever tool with injected config for multi-user safety."""

    @tool("argument_retriever")
    def retrieve_context(
        query: str,
        config: Annotated[RunnableConfig, InjectedToolArg]
    ) -> tuple[list[Document], list[str]]:
        """Search stored documents for relevant context."""
        print("RAG retriever activated")

        if supabase is None:
            return [], []

        # 从 config 获取请求级别的上下文 (线程安全)
        user_id = config["configurable"].get("user_id")
        project_id = config["configurable"].get("project_id")
        source_ids = config["configurable"].get("source_ids")

        print(f"Filter context - user_id: {user_id}, project_id: {project_id}, source_ids: {source_ids}")

        # Generate query embedding
        query_embedding = embedding_model.embed_query(query)

        # Call Supabase match_documents RPC
        response = supabase.rpc(
            "match_documents",
            {
                "query_embedding": query_embedding,
                "match_count": 4,
                "filter_user_id": user_id,
                "filter_project_id": project_id,
                "filter_source_ids": source_ids,
                "similarity_threshold": 0.5
            }
        ).execute()

        # Convert to LangChain Document format
        docs = []
        for row in response.data:
            extra_metadata = row["metadata"] if row["metadata"] is not None else {}
            doc = Document(
                page_content=row["content"],
                metadata={
                    "source_id": row["source_id"],
                    "source_name": row["source_name"],
                    "token_count": row["token_count"],
                    "page_numbers": row["page_numbers"],
                    "similarity": row["similarity"],
                    **extra_metadata
                }
            )
            docs.append(doc)
            logging.info("Retrieved doc: %s (similarity: %.4f)", row["source_name"], row["similarity"])

        info_sources = [doc.metadata.get("source_name") for doc in docs]
        print(f"Retrieved {len(docs)} documents from Supabase")
        return docs, info_sources

    return retrieve_context

class LlmAgent:
    """
    Multi-user safe LLM agent.

    用户上下文通过 RunnableConfig 传递，而非实例变量，确保并发安全。

    Conversation Storage:
    - Redis: Short-term via checkpointer (with TTL)
    - Supabase: Long-term persistence
    """

    def __init__(
        self,
        checkpointer: BaseCheckpointSaver,
        supabase_storage: "SupabaseStorage | None" = None,
        redis_storage: "RedisStorage | None" = None
    ):
        self._checkpointer = checkpointer

        # Get Supabase client from database for RAG
        self._supabase = supabase_storage.get() if supabase_storage else None

        # Conversation storage manager
        self._conversation_storage = ConversationStorage(
            supabase_storage=supabase_storage,
            redis_storage=redis_storage
        )

        # LLM model — non-reasoning mode to reduce latency and cost
        self.model = ChatOpenAI(
            model="gpt-5-nano",
            temperature=0.1,
            model_kwargs={"reasoning_effort": "minimal"},
        )

        # Embedding model for query vectors
        self._embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")

        # Setup retriever tool
        self._retrieve_context = make_retriever_tool(self._supabase, self._embedding_model)
        self.tools = [self._retrieve_context]

        self.agent = create_agent(
            model=self.model,
            tools=self.tools,
            middleware=[
                #log_state, 
                trim_messages],
            system_prompt=SystemMessage(STRUCTURED_OUTPUT_SYSTEM_PROMPT),  # Basic system prompt
            checkpointer=self._checkpointer,
        )
        self.counter = 0
    
    
    async def chat(self, request: ChatRequest) -> Any:
        self.counter += 1
        logging.info(f"Agent called {self.counter} times")
        # 1. Refresh Redis TTL at request start
        if not self._conversation_storage:
            logging.error("|----- No conversation storage configured")
            
        # 2. Cold start: load from Supabase if thread not in Redis
        history_to_add = await self._conversation_storage.cold_start_load(request.thread_id)
        logging.info(history_to_add)


        if history_to_add:
            to_history: list[BaseMessage] = []
        
            # 限制最大条数（取最近 MAX_MESSAGES 条）
            trimmed = history_to_add[-MAX_MESSAGES:] if len(history_to_add) > MAX_MESSAGES else history_to_add
        
            for i, msg in enumerate(trimmed):
                if not isinstance(msg, dict):
                    logger.warning("Skipping non-dict history item at index=%s", i)
                    continue
        
                role = msg.get("role")
                if role not in SUPPORTED_ROLES:
                    logger.warning("Skipping unsupported role=%r at index=%s", role, i)
                    continue
        
                text = _extract_text(msg)
                if not text:
                    logger.warning("Skipping empty/unparseable content role=%s index=%s", role, i)
                    continue
        
                safe_text = _sanitize_text(text)
                to_history.append(_to_lc_message(role, safe_text))
        
                # 安全日志：不打印全文
                logger.debug("History accepted index=%s role=%s chars=%s", i, role, len(safe_text))
        
            if to_history:
                self.agent.update_state(
                    config={"configurable": {"thread_id": request.thread_id}},
                    values={"messages": to_history},
                    as_node="__start__",
                )
            else:
                logger.info("No valid history messages to inject (all skipped).")
            
        # 3. Build Configuration
        config: RunnableConfig = {
            "configurable": {
                "thread_id": request.thread_id,
            }
        }
        
        system_msg = SystemMessage(content="""you are a helpful assistant, keep everything brief""") # 用户不允许编辑system message
        human_msg = _build_human_message(request.content)

        # Run LLM call
        response = self.agent.invoke(
            {"messages": human_msg},  # todo weird bug why system_msg is not allowed here
            config=config,
        )

        ai_msg = response["messages"][-1]

        # Parse AI response into structured output contents
        logging.info(f"ai message + {ai_msg}")


        # Get token counts from usage_metadata
        usage = ai_msg.usage_metadata or {}
        input_tokens = usage.get('input_tokens', 0)
        logging.info(f"input tokens: {input_tokens}")
        output_tokens = usage.get('output_tokens', 0)
        logging.info(f"output tokens: {output_tokens}")

        self._conversation_storage.refresh_ttl(request.thread_id)

        # store both human and ai messages
        await self._conversation_storage.persist(
            #store chat
            user_id=request.user_id,
            thread_id=request.thread_id,
            role= "user",
            content=human_msg.content,
            token_count=input_tokens
        )

        resp = await self._conversation_storage.persist(
            #store ai
            user_id=request.user_id,
            thread_id=request.thread_id,
            role= "assistant",
            content=[{"type": "text",
                      "text": ai_msg.content}],
            token_count=output_tokens
        )
        logging.info(f"store-----:{resp}")
        #only need to return ai response
        return ChatResponse(
            id=resp['id'],
            role=resp['role'],
            content=[{"type": "text",
                       "text": ai_msg.content}],
            created_at=resp["created_at"],
            total_tokens=input_tokens + output_tokens
        )