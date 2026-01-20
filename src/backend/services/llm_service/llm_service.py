from langchain.messages import AIMessage
import dotenv
import logging
from typing import TypeVar, AsyncGenerator, Any
from pydantic import BaseModel
from langgraph.checkpoint.base import BaseCheckpointSaver
from supabase import Client
from src.backend.schemas import ChatRequest
from src.backend.services.llm_service.llm_instance import LlmAgent

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)




def _build_ai_message(request: ChatRequest) -> AIMessage:
    """
    
    build this locally first
    
    :return: 
    """
    return AIMessage(request.contents)


class LlmService:
    """
    Provide a unified interface for providing LLM services.

    Supports both regular chat and structured output modes.
    Structured output ensures the LLM returns responses conforming to a specified Pydantic schema.
    """

    def shut_down(self):
        pass
    def restart(self):
        pass

    def __init__(self, checkpointer: BaseCheckpointSaver, supabase: Client = None):
        super().__init__()
        dotenv.load_dotenv()
        self.model = LlmAgent(checkpointer=checkpointer, supabase=supabase)

    def get_usage(self):
        ... #todo 
    
    async def achat(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        async for chunk in self.model.achat(request):
            yield chunk
            
    def chat(self, request: ChatRequest)-> Any:
        return self.model.chat(request)
# debug code
# import asyncio
# 
# async def main():
#     service = LlmService()
#     #test multiple thread chat
#     
#     human_messages = [
#         HumanMessage(content="What is the capital of France?"),
#         HumanMessage(content="What is the capital of Germany?"),
#         HumanMessage(content="What is the capital of Spain?")
#     ]
# 
# 
#     async def stream_one(service: LlmService, message: HumanMessage, idx: int):
#         # label each stream so outputs are distinguishable
#         prefix = f"[Q{idx}] "
#     
#         print(f"{prefix}START: {message.content}")
#     
#         async for chunk in service.multi_thread_stream_chat(human_message=message):
#             # adjust attribute depending on your model: .content / .delta / .text
#             text = getattr(chunk, "content", str(chunk))
#             print(prefix + text, end="", flush=True)
#     
#         print(f"\n{prefix}END\n")
# 
#     tasks = [
#         asyncio.create_task(stream_one(service, msg, i))
#         for i, msg in enumerate(human_messages, start=1)
#     ]
#     
#     await asyncio.gather(*tasks)
# 
# if __name__ == "__main__":
#     asyncio.run(main())
