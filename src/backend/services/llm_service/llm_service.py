from http.client import responses

from langchain.chat_models import init_chat_model
from langchain.messages import SystemMessage, HumanMessage, AIMessage
import dotenv
from src.backend.services.service import Service


class LlmService(Service):
    """
        Provide a unified interface for providing LLM services.
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