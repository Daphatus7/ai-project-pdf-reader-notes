from pydantic.v1 import BaseModel


class ChatRedisRequest(BaseModel):
    user_id: str
    thread_id: str
    

class RedisStorage:
    """
        redis storage for faster conversation stored in memory.
        -planned for the future
    """
    
    def store_chat(self, chat_redis_request: ChatRedisRequest):
        """
            Store the chat history to redis for faste
        :param chat_redis_request: 
        :return: 
        """
        
        
        