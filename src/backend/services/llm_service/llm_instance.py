import json
import logging
from typing import Any

from langchain.agents import create_agent, AgentState
from langchain.agents.middleware import before_model
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langchain_core.vectorstores import VectorStore, InMemoryVectorStore
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langgraph.graph.message import REMOVE_ALL_MESSAGES
from langgraph.runtime import Runtime

from src.backend.schemas import ChatRequest
from langgraph.checkpoint.memory import InMemorySaver
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
    """Keep only the last few messages to fit context window."""
    messages = state["messages"]

    if len(messages) <= 3:
        return None  # No changes needed

    first_msg = messages[0]
    recent_messages = messages[-3:] if len(messages) % 2 == 0 else messages[-4:]
    new_messages = [first_msg] + recent_messages

    return {
        "messages": [
            RemoveMessage(id=REMOVE_ALL_MESSAGES),
            *new_messages
        ]
    }

 


def _should_send_structured_update(chunk_count: int, text: str) -> bool:
    """Check if we should send a structured update."""
    return (chunk_count % 15 == 0 and len(text) > 50) or len(text) > 300

def make_argument_retriever_tool(agent_ref):
    @tool("argument_retriever")
    def retrieve_context(query: str):
        """search stored documents for relevant context"""
        print("activated")
        if agent_ref.storage is None:
            return "No vector store is initialized.", []
        docs = agent_ref.storage.similarity_search(query=query, k=4)
        for doc in docs:
            logging.info("Retrieved doc metadata: %s", doc.metadata)
        info_sources = [doc.metadata.get("source") for doc in docs]
        return docs, info_sources

    return retrieve_context

class LlmAgent:
    
    def __init__(self):
        # first make sure there is a valid session for the agent
        self.model = ChatOpenAI(
            model="gpt-5-nano",
            temperature=0.1,
        )
        
        self.storage = InMemoryVectorStore(
            embedding=OpenAIEmbeddings(model="text-embedding-3-large")
        )
        # todo add document to the vector store for testing
        
        raw_docs = None
        with open("services/context_provider/chonkie_content.json", "r", encoding="utf-8") as r:
            raw_docs = json.load(r)
        
        # Convert dict format to LangChain Document objects
        # chonkie_content.json format: [{"content": "...", "metadata": {...}}]
        # Document format: Document(page_content="...", metadata={...})
        documents = [
            Document(
                page_content=doc.get("content", ""),
                metadata=doc.get("metadata", {})
            )
            for doc in raw_docs
        ]
        
        self.store_ids = self.storage.add_documents(
            documents=documents
        )
        print(self.store_ids)
        self.retrieve_context = make_argument_retriever_tool(self)
        self.tools = [
            self.retrieve_context
            ]
        self.agent = create_agent(
            model=self.model,
            tools=self.tools,
            middleware=[log_state, trim_messages],
            checkpointer=InMemorySaver(), # todo debug only - use redis instead
        )
        self.counter = 0

    async def chat(self, chat_request: ChatRequest):
        self.counter += 1
        print(f"Agent called {self.counter} times")
        print(f"agent has the context {self.agent.get_context_jsonschema()}")
        print("----------------")
        config: RunnableConfig = {"configurable": {"thread_id": chat_request.thread_id}}
        system_msg = SystemMessage(content=chat_request.system_message)
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
