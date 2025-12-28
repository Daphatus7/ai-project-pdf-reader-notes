from langchain.chat_models import init_chat_model
from langchain.messages import SystemMessage, HumanMessage, AIMessage
import dotenv
from typing import TypeVar, Type
from pydantic import BaseModel

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
    
    def get_usage(self):
        return self.model.get_usage()
    
    #streamin chat
    def stream_chat(self, 
             system_message : SystemMessage = SystemMessage(content="You are a helpful assistant."),
             human_message : HumanMessage = None,
                ):
        messages = [system_message, human_message]
        response_stream = self.model.stream(messages)
        for chunk in response_stream:
            yield chunk
    
    #multi thread chat
    async def multi_thread_chat(self, 
             system_message : SystemMessage = SystemMessage(content="You are a helpful assistant."),
             human_message : HumanMessage = None,
                ):
        messages = [system_message, human_message]
        return await self.model.ainvoke(messages)

    async def multi_thread_stream_chat(
            self,
            system_message: SystemMessage = SystemMessage(content="You are a helpful assistant."),
            human_message: HumanMessage | None = None,
    ):
        messages = [system_message, human_message]
        async for chunk in self.model.astream(messages):
            yield chunk

    def chat_with_structured_output(
            self,
            output_schema: Type[T],
            system_message: SystemMessage = SystemMessage(content='You are a helpful assistant.'),
            human_message: HumanMessage | None = None,
    ) -> T:
        """
        Chat with LLM and enforce structured output conforming to the provided Pydantic schema.
        
        Uses LangChain's with_structured_output to ensure the LLM returns
        a response that matches the expected schema.
        
        Args:
            output_schema: Pydantic model class defining the expected output structure
            system_message: System message to set assistant behavior
            human_message: User's message
            
        Returns:
            Instance of the output_schema Pydantic model
        """
        structured_model = self.model.with_structured_output(output_schema)
        messages = [system_message, human_message]
        return structured_model.invoke(messages)

    async def async_chat_with_structured_output(
            self,
            output_schema: Type[T],
            system_message: SystemMessage = SystemMessage(content='You are a helpful assistant.'),
            human_message: HumanMessage | None = None,
    ) -> T:
        """
        Async chat with LLM and enforce structured output conforming to the provided Pydantic schema.
        
        Uses LangChain's with_structured_output to ensure the LLM returns
        a response that matches the expected schema.
        
        Args:
            output_schema: Pydantic model class defining the expected output structure
            system_message: System message to set assistant behavior
            human_message: User's message
            
        Returns:
            Instance of the output_schema Pydantic model
        """
        structured_model = self.model.with_structured_output(output_schema)
        messages = [system_message, human_message]
        return await structured_model.ainvoke(messages)


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
