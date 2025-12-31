from fastapi import HTTPException
from langchain.chat_models import init_chat_model
from langchain.messages import SystemMessage, HumanMessage, AIMessage
import dotenv
import logging
from typing import TypeVar, Type
from pydantic import BaseModel

from src.backend.schemas import ChatRequest

logger = logging.getLogger(__name__)

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
                valid_payload: ChatRequest,
                ):
        """
            当前假设 valid_payload 已经过验证且符合 ChatRequest 结构
        :param valid_payload: 
        :return: 
        """
        try: 
        #build system message
            system_message = SystemMessage("You are a helpful assistant.")
            
            content_parts = []
            for item in valid_payload.contents:
                if item.type == "text":
                    content_parts.append({"type": "text", "text": item.text})
                elif item.type == "image":
                    # Convert base64 to data URL format for LangChain
                    data_url = f"data:{item.mime_type};base64,{item.data}"
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": data_url}
                    })
                    
            # parse user messages
            human_message = HumanMessage(
                contextlib=valid_payload.contents
            )
            
            messages = [system_message, human_message]
            response = self.model.invoke(messages)
            return response
        except Exception as e:
            logger.error(f'Error in chat endpoint: {e}', exc_info=True)
            raise HTTPException(status_code=500, detail=f'Error processing chat request: {str(e)}')


        #
        
        
        ...
    
    def get_usage(self):
        return self.model.get_usage()

    def stream_chat(self,
                    system_message : SystemMessage = SystemMessage(content="You are a helpful assistant."),
                    human_message : HumanMessage = None,
                    ):
        """Streaming chat that yields chunks synchronously"""
        messages = [system_message, human_message]
        response_stream = self.model.stream(messages)
        for chunk in response_stream:
            yield chunk

    async def multi_thread_stream_chat(
            self,
            system_message: SystemMessage = SystemMessage(content="You are a helpful assistant."),
            human_message: HumanMessage | None = None,
    ):
        """Async streaming chat that yields chunks"""
        messages = [system_message, human_message]
        async for chunk in self.model.astream(messages):
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
