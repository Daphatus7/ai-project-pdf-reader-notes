from langchain.chat_models import init_chat_model
from langchain.messages import SystemMessage, HumanMessage, AIMessage
import dotenv
from typing import TypeVar, Type
from pydantic import BaseModel

from src.backend.schemas import ChatRequest

T = TypeVar('T', bound=BaseModel)


class LlmService:
    """
    Provide a unified interface for providing LLM services.
    
    Supports both regular chat and structured output modes.
    Structured output ensures the LLM returns responses conforming to a specified Pydantic schema.
    """

    def start(self):
        self.model = init_chat_model("gpt-5-nano")

    def shut_down(self):
        pass
    def restart(self):
        pass

    def __init__(self):
        super().__init__()
        dotenv.load_dotenv()
        self.model = None
        
    def chat(self, 
             system_message : SystemMessage = SystemMessage(content="You are a helpful assistant."),
             human_message : HumanMessage = None,
             ai_message : AIMessage = None
                ) -> AIMessage:
        #filter out if the input is None
        if ai_message is not None:
            return ai_message
        messages = [system_message, human_message]
        response = self.model.invoke(messages)
        return response
    
    def chat_v2(self, 
                valid_payload,
                ):
        ...
    
    def get_usage(self):
        return self.model.get_usage()
    

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
