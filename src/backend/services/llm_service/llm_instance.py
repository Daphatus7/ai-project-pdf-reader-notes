from typing import Any

from langchain.agents import create_agent, AgentState
from langchain.agents.middleware import before_model
from langchain_core.messages import RemoveMessage, HumanMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph.message import REMOVE_ALL_MESSAGES
from langgraph.runtime import Runtime

from src.backend.services.llm_service.llm_session import LlmSession
from langgraph.checkpoint.memory import InMemorySaver


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


class CustomAgentState(AgentState):
    user_id: str
    preferences: dict
    
class LlmInstance:
    def __init__(self, session: LlmSession):
        # first make sure there is a valid session for the agent
        self.agent = create_agent(
            model="gpt-5-nano",
            # tools
            # middleware,
            state_schema=CustomAgentState,
            middleware=[trim_messages],
            checkpointer=InMemorySaver(),
        )
        self.config: RunnableConfig = {"configurable": {"thread_id": "1"}}


    def chat(self, human_msg: HumanMessage):
        final_response = self.agent.invoke(human_msg, self.config)

