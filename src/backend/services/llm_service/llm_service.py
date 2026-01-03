from fastapi import HTTPException
from langchain.chat_models import init_chat_model
from langchain.messages import SystemMessage, HumanMessage, AIMessage
import dotenv
import logging
from typing import TypeVar, Type, AsyncGenerator

from langchain_core.runnables.utils import Input
from pydantic import BaseModel
import json

from src.backend.schemas import ChatRequest
from src.backend.services.llm_service.llm_instance import LlmAgent

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


def _should_send_structured_update(chunk_count: int, text: str) -> bool:
    """Check if we should send a structured update."""
    return (chunk_count % 15 == 0 and len(text) > 50) or len(text) > 300

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
        """
        Async streaming chat that yields text chunks.
        """

        # first, get context
        async for chunk in self.__structured_stream_chat(request):
            yield chunk
    
    
    async def __structured_stream_chat(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """
        Async streaming chat that yields SSE formatted chunks.
        """
        # system_msg = SystemMessage(content=STRUCTURED_OUTPUT_SYSTEM_PROMPT)
        # human_msg = _build_human_message(request.contents)

        accumulated_text = ''
        chunk_count = 0
        last_structured_update = None

        try:
            async for chunk in self.model.chat(request):
                text = getattr(chunk, 'content', str(chunk))
                accumulated_text += text
                chunk_count += 1
    
                # Send text chunk
                yield f'data: {json.dumps({"type": "text", "content": text})}\n\n'
    
                # Periodic structured updates
                if _should_send_structured_update(chunk_count, accumulated_text):
                    partial_output = {'content': accumulated_text, 'content_type': 'answer'}
                    if partial_output != last_structured_update:
                        last_structured_update = partial_output
                        yield f'data: {json.dumps({"type": "structured", "data": partial_output})}\n\n'
    
            # Final structured output
            yield f'data: {json.dumps({"type": "structured", "data": {"content": accumulated_text, "content_type": "answer"}})}\n\n'
            yield f'data: {json.dumps({"type": "done"})}\n\n'
    
        except Exception as e:
            logger.error(f'Error in structured stream: {e}', exc_info=True)
            yield f'data: {json.dumps({"type": "error", "message": str(e)})}\n\n'


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
