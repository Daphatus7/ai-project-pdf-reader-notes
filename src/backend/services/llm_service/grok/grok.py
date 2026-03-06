

import os
from xai_sdk import Client
from xai_sdk.chat import user, system

from src.backend.schemas.chat.llm import ChatRequest


class LlmGrok:

    def __init__(self):
        """
            
        """
        self.client = Client(api_key=os.getenv("XAI_API_KEY"))


    def chat(self, request):
        """
            Request includes users information like user_id etc
        :param request: 
        :return: 
        """
        chat = self.client.chat.create(model="grok-4-1-fast-reasoning")
        chat.append(system("You are Grok, a chatbot inspired by the Hitchhiker's Guide to the Galaxy."))
        chat.append(user("What is the meaning of life, the universe, and everything?"))
        response = chat.sample()
    
    def get_context(self, request: ChatRequest):
        """
            Get the user context for the 
        :param request: 
        :return: 
        """








    pass
    
    def get_context(self, context):
        pass
    
    def store_context_to_db(self, context):
        pass
    
    def store_context_to_redis(self, context):
        pass



