import json
import logging
from sys import thread_info
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

from src.backend.schemas import ChatRequest
from langgraph.checkpoint.base import BaseCheckpointSaver
from langchain.messages import RemoveMessage
from src.backend.services.llm_service.conversation_storage import ConversationStorage

if TYPE_CHECKING:
    from src.backend.services.storage.supabase_storage import SupabaseStorage
    from src.backend.services.storage.redis_storage import RedisStorage


STRUCTURED_OUTPUT_SYSTEM_PROMPT = '''You are a helpful assistant that provides well-structured responses.

FORMAT YOUR RESPONSES USING PROPER MARKDOWN:

1. HEADERS: Use # ## ### for section organization

2. MATH EXPRESSIONS (CRITICAL - follow these rules EXACTLY):

   A) ALWAYS wrap ALL math in $...$ delimiters - no exceptions!
      - Variables: $P(t)$, $c_n$, $\\omega$, $T$
      - Equations: $P(t) = A\\cos(\\omega t)$
      - Subscripts/superscripts: $c_{-1}$, $e^{j\\omega t}$, $c_n^*$

   B) Use LaTeX commands, NEVER Unicode symbols:
      - WRONG: ∑, ∞, ω, π, ∫ (Unicode symbols)
      - CORRECT: $\\sum$, $\\infty$, $\\omega$, $\\pi$, $\\int$

   C) Display math: Use $$ on separate lines (NOT inside bullet points)

   WRONG examples (will NOT render):
   - P(t) = ∑_{n=-∞}^{∞} c_n e^{jnωt}
   - c_{-n} = c_n^*
   - cos(ωt) = (e^{jωt} + e^{-jωt})/2

   CORRECT examples (WILL render):
   - $P(t) = \\sum_{n=-\\infty}^{\\infty} c_n e^{jn\\omega t}$
   - $c_{-n} = c_n^*$
   - $\\cos(\\omega t) = (e^{j\\omega t} + e^{-j\\omega t})/2$

3. CODE BLOCKS: Use ```language

4. TABLES WITH MATH (CRITICAL):
   - All math in cells MUST use $...$ delimiters
   - For absolute value |x|, use $\\lvert x \\rvert$ NOT $|x|$ (pipe conflicts with table syntax)
   - Example: "Vanishing gradient for large $\\lvert x \\rvert$"

5. LISTS: Use - for bullets. Keep math inline with $...$

6. BLOCKQUOTES: Use > for notes

CRITICAL REMINDER: Every math expression must use $...$ delimiters. In tables, use \\lvert and \\rvert for absolute values instead of |.'''
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
    content_parts = []
    for item in contents:
        if item.type == "text":
            content_parts.append({"type": "text", "text": item.text})
        elif item.type == "image":
            data_url = f"data:{item.mime_type};base64,{item.data}"
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

        # LLM model
        self.model = ChatOpenAI(
            model="gpt-5-nano",
            temperature=0.1,
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
            system_prompt=SystemMessage("You are a helpful assistant."),  # Basic system prompt
            checkpointer=self._checkpointer,
        )
        self.counter = 0
    
    def toHistoryMessage(self, history: list[dict]):
        return [
            #return either ai message or human message based on content inside the history
            HumanMessage(content=msg["content"]) 
            if msg["role"] == "user" else AIMessage(content=msg["content"])
            for msg in history
        ]
    
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
            self.agent.update_state(
                config={"configurable": {"thread_id": request.thread_id}},
                values={"messages": self.toHistoryMessage(history_to_add)},
                as_node="__start__"
            )
            
            # todo Debug: log loaded messages delete later
            current_history = self.agent.get_state(
                config={"configurable": {"thread_id": request.thread_id}})
            
            for msg,idx in current_history :
                logging.info(f"Cold start msg {idx}: {msg.content}")
            
        # 3. Build Configuration
        config: RunnableConfig = {
            "configurable": {
                "thread_id": request.thread_id,
            }
        }
        
        system_msg = SystemMessage(content="""you are a helpful assistant, keep everything brief""") # 用户不允许编辑system message
        human_msg = _build_human_message(request.contents)

        # Run LLM call
        response = self.agent.invoke(
            {"messages": human_msg},  # todo weird bug why system_msg is not allowed here
            config=config
        )

        ai_msg = response["messages"][-1]

        # Parse AI response into structured output contents
        output_contents = _parse_ai_response(ai_msg)

        # 5. Dual-write: persist to Supabase
        human_content = human_msg.content
        # For storage, extract text content only
        ai_content = " ".join(
            item["text"] for item in output_contents if item["type"] == "text"
        )

        # Get token counts from usage_metadata
        input_tokens = 0
        output_tokens = 0
        if hasattr(ai_msg, "usage_metadata") and ai_msg.usage_metadata:
            input_tokens = ai_msg.usage_metadata.get('input_tokens', 0)
            output_tokens = ai_msg.usage_metadata.get('output_tokens', 0)

        self._conversation_storage.refresh_ttl(request.thread_id)

        await self._conversation_storage.persist(
            user_id=request.user_id,
            thread_id=request.thread_id,
            human_content=human_content,
            ai_content=ai_content,
            input_tokens=input_tokens,
            output_tokens=output_tokens
        )

        return output_contents