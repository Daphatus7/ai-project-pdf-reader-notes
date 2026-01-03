from dataclasses import dataclass, asdict
from typing import Any

from langchain.agents import create_agent, AgentState
from langchain.agents.middleware import before_model, wrap_tool_call
from langchain_core.messages import RemoveMessage, HumanMessage, ToolMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from langgraph.graph.message import REMOVE_ALL_MESSAGES
from langgraph.runtime import Runtime

from src.backend.schemas.auth import UserRequest
from src.backend.services.llm_service.llm_session import LlmSession
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

# @wrap_tool_call
# def handle_tool_errors(request, handler):
#     """Handle tool execution errors with custom messages."""
#     try:
#         return handler(request)
#     except Exception as e:
#         # Return a custom error message to the model
#         return ToolMessage(
#             content=f"Tool error: Please check your input and try again. ({str(e)})",
#             tool_call_id=request.tool_call["id"]
#         )

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
class LlmAgent:
    def __init__(self):
        # first make sure there is a valid session for the agent
        self.model = ChatOpenAI(
            model="gpt-5-nano",
            temperature=0.1,
            # max_tokens=1000,
            # timeout=30
            # ... (other params)
        )
        
        self.agent = create_agent(
            model=self.model,
            middleware=[trim_messages],
            checkpointer=InMemorySaver(), # todo debug only - use redis instead
        )



    async def chat(self, user_request: UserRequest):
        # Get the correct thread and context
        config: RunnableConfig = {"configurable": {"thread_id": user_request.thread_id}}
        system_msg = SystemMessage(content=STRUCTURED_OUTPUT_SYSTEM_PROMPT)
        human_msg = _build_human_message(user_request.message)

        # Use ainvoke for async execution
        final_response = self.agent.astream(
            [system_msg, human_msg],
            config,
            # stream_mode="values"  # Optional: for streaming full state after each step
        )
        return final_response