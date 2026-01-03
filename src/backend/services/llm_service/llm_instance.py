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
        human_msg = HumanMessage(user_request.message)
        ai_msg = SystemMessage("you are a helpful assistant")

        # Use ainvoke for async execution
        final_response = await self.agent.ainvoke(
            [human_msg, ai_msg],
            config,
            # stream_mode="values"  # Optional: for streaming full state after each step
        )
        return final_response