from fastapi import HTTPException
from langchain.messages import SystemMessage, HumanMessage, AIMessage
import dotenv
import logging
from typing import TypeVar, AsyncGenerator
from pydantic import BaseModel
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

    def start(self):
        self.model = LlmAgent()

    def shut_down(self):
        pass
    def restart(self):
        pass

    def __init__(self):
        super().__init__()
        dotenv.load_dotenv()
        self.model = None
    
    def chat_v2(self, 
                valid_payload: ChatRequest,
                ):
        """
            当前假设 valid_payload 已经过验证且符合 ChatRequest 结构
            目前并没有使用，在用astream 的方式
        :param valid_payload: 
        :return: 
        """
        try: 
        #build system message
            system_message = SystemMessage("You are a helpful assistant.")
        
            # parse user messages
            # human_message = _build_human_message(contents=valid_payload.contents)
            # 
            # messages = [system_message, human_message]
            # response = self.model.invoke(messages)
            # return response
            return None
        except Exception as e:
            logger.error(f'Error in chat endpoint: {e}', exc_info=True)
            raise HTTPException(status_code=500, detail=f'Error processing chat request: {str(e)}')

    def get_usage(self):
        return self.model.get_usage()
    
    
    async def achat(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        async for chunk in self.model.chat(request):
            yield chunk


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
