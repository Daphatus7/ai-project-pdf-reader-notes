import json
import logging
from typing import Any

from langchain.agents import create_agent, AgentState
from langchain.agents.middleware import before_model
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
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
    """

    def __init__(self, checkpointer: BaseCheckpointSaver, supabase: Client | None = None):
        self._checkpointer = checkpointer
        self._supabase = supabase

        # LLM model
        self.model = ChatOpenAI(
            model="gpt-5-nano",
            temperature=0.1,
        )

        # Embedding model for query vectors
        self._embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")

        # Setup retriever tool (传入依赖，不传入请求级别的上下文)
        self._retrieve_context = make_retriever_tool(self._supabase, self._embedding_model)
        self.tools = [self._retrieve_context]

        self.agent = create_agent(
            model=self.model,
            tools=self.tools,
            middleware=[log_state, trim_messages],
            checkpointer=self._checkpointer,
        )
        self.counter = 0
    async def achat(self, chat_request: ChatRequest):
        self.counter += 1
        print(f"Agent called {self.counter} times")
        print(f"agent has the context {self.agent.get_context_jsonschema()}")
        print("----------------")

        # 通过 config 传递用户上下文 (线程安全，支持多用户并发)
        config: RunnableConfig = {
            "configurable": {
                "user_id": chat_request.user_id,
                "project_id": chat_request.project_id,
                "thread_id": chat_request.thread_id,
                "source_ids": chat_request.source_ids,
            }
        }
        system_msg = SystemMessage(content="you are a helpful assistant")
        human_msg = _build_human_message(chat_request.contents)
            
        accumulated_text = ""
        last_structured_update = None
            
        async for chunk in self.agent.astream(
                {"messages": [system_msg, human_msg]},  # Input as dict with 'messages' key
                config,
                stream_mode="updates"  # Streams deltas after each node (model/tools)
        ):
            # Extract text delta from latest model step
            if "model" in chunk:  # Agent LLM node name
                delta = chunk["model"].get("messages", [])
                if isinstance(delta, list) and len(delta) > 0:
                    last_msg_chunk = delta[-1]  # Latest AIMessageChunk
                    if hasattr(last_msg_chunk, "content") and last_msg_chunk.content:
                        text_delta = last_msg_chunk.content
                        accumulated_text += text_delta

                        # Yield text SSE chunk
                        yield f'data: {json.dumps({"type": "text", "content": text_delta})}\n\n'

                        # Periodic structured update (adapt your _should_send_structured_update)
                        if _should_send_structured_update(len(accumulated_text), accumulated_text):
                            partial_output = {"content": accumulated_text, "content_type": "answer"}
                            if partial_output != last_structured_update:
                                last_structured_update = partial_output
                                yield f'data: {json.dumps({"type": "structured", "data": partial_output})}\n\n'

        # Final structured + done
        yield f'data: {json.dumps({"type": "structured", "data": {"content": accumulated_text, "content_type": "answer"}})}\n\n'
        yield f'data: {json.dumps({"type": "done"})}\n\n'
    async def chat(self, request: ChatRequest):
        self.counter += 1
        print(f"Agent called {self.counter} times")
        print(f"agent has the context {self.agent.get_context_jsonschema()}")
        print("----------------")

        # 通过 config 传递用户上下文 (线程安全，支持多用户并发)
        config: RunnableConfig = {
            "configurable": {
                "user_id": request.user_id,
                "project_id": request.project_id,
                "thread_id": request.thread_id,
                "source_ids": request.source_ids,
            }
        }
        print(f"RAG Filter - user_id: {request.user_id}, source_ids: {request.source_ids}")
        system_msg = SystemMessage(content="""you are a helpful assistant""") # 用户不允许编辑system message
        human_msg = _build_human_message(request.contents)

        # Run LLM call
        response = self.agent.invoke(
            {"messages": [system_msg, human_msg]},  # Input as dict with 'messages' key
            config
        )

        # todo debug text to be deleted
        # -|
        #  |
        #  V
        # Save messages to JSON (append to existing)
        messages_data = []
        for msg in response["messages"]:
            msg_dict = {
                "type": msg.__class__.__name__,
                "content": msg.content,
                "id": msg.id,
                "additional_kwargs": msg.additional_kwargs,
                "response_metadata": msg.response_metadata,
            }
            # Add usage metadata for AIMessage
            if hasattr(msg, "usage_metadata") and msg.usage_metadata:
                msg_dict["usage_metadata"] = msg.usage_metadata
            if hasattr(msg, "tool_calls"):
                msg_dict["tool_calls"] = msg.tool_calls
            messages_data.append(msg_dict)

        output_path = "services/llm_service/chat_messages.json"

        # Load existing messages if file exists
        existing_data = {"messages": []}
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            pass  # File doesn't exist or is invalid, start fresh
        

        # Append new messages
        existing_data["messages"].extend(messages_data)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        print(f"Appended {len(messages_data)} messages (total: {len(existing_data['messages'])}) to {output_path}")
        #   ^
        #   |
        #   |
        # todo debug text to be deleted

        ai_msg = response["messages"][-1]
        print(ai_msg.content)

        # Print token usage from LangChain
        if hasattr(ai_msg, "usage_metadata") and ai_msg.usage_metadata:
            usage = ai_msg.usage_metadata
            print("\n--- Token Usage ---")
            print(f"Input tokens:  {usage.get('input_tokens', 'N/A')}")
            print(f"Output tokens: {usage.get('output_tokens', 'N/A')}")
            print(f"Total tokens:  {usage.get('total_tokens', 'N/A')}")
            if usage.get('input_token_details'):
                print(f"Input details: {usage['input_token_details']}")
            if usage.get('output_token_details'):
                print(f"Output details: {usage['output_token_details']}")
            print("-------------------")
