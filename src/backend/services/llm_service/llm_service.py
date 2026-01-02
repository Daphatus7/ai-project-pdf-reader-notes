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

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)

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
        """
        Not in use
        
        :param system_message: 
        :param human_message: 
        :param ai_message: 
        :return: 
        """
        
        
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
            目前并没有使用，在用astream 的方式
        :param valid_payload: 
        :return: 
        """
        try: 
        #build system message
            system_message = SystemMessage("You are a helpful assistant.")
        
            # parse user messages
            human_message = _build_human_message(contents=valid_payload.contents)
            
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
    
    

    
    async def structured_stream_chat(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """
        Async streaming chat that yields SSE formatted chunks.
        """
        system_msg = SystemMessage(content=STRUCTURED_OUTPUT_SYSTEM_PROMPT)
        human_msg = _build_human_message(request.contents)
        ai_msg = _build_ai_message(request)
    
        accumulated_text = ''
        chunk_count = 0
        last_structured_update = None
    
        try:
            async for chunk in self.model.astream([system_msg, human_msg]):
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
