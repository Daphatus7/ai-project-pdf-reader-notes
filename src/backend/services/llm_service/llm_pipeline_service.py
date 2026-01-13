# @file        llm_pipeline_service.py
# @description 
# @author      [Peiyu Wang]
# @date        13/1/2026
# @license     © 2026 . All rights reserved.
import asyncio
import json
import logging
import os
import time
from typing import Any, Coroutine

import dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.rate_limiters import InMemoryRateLimiter

RATE_PER_MINUTE = 5000.0
SEC_PER_MINUTE = 60.0
TOKEN_PER_MINUTE = 2000000
TOKEN_PER_DAY = 20000000 

class LlmServicePipe:


    
    def __init__(self):
        self.system_message = (
            SystemMessage("you are an expert at summarise content, "
                          "provide a brief summary for the content"))
        self.current_rate = 0
        self.current_token_per_minute = 0
        self.current_token_per_day = 0
        
        self.rate_limiter = InMemoryRateLimiter(
            requests_per_second=RATE_PER_MINUTE/SEC_PER_MINUTE,  # <-- Super slow! We can only make a request once every 10 seconds!!
            check_every_n_seconds=0.1,  # Wake up every 100 ms to check whether allowed to make a request,
            max_bucket_size=10,  # Controls the maximum burst size.
        )
        dotenv.load_dotenv() # todo delete this in production
        
        self.model = init_chat_model(
            "gpt-5-nano",
            # Kwargs passed to the model:
            temperature=0.2,
            timeout=30,
            rate_limiter=self.rate_limiter
        )
    
    
    async def request_batch_llm_call(self, requests: list[str]):
        """
            this requests if current llm call exceeds the ratings of the system
            If it does, the requests will be hold on to a queue,
            If it does not, this will be sent to the batch_llm_call
        """
    
    async def llm_call_summary(self, request:str)-> AIMessage:
        conversation = [
            self.system_message,
            HumanMessage(request),
        ]
        return self.model.invoke(conversation)
        
    async def process_request(self, request: str) -> dict:
        start = time.perf_counter()
        done = await self.llm_call_summary(request)
        elapsed = time.perf_counter() - start
        logging.info("request %s finished in %.3f s", request, elapsed)

        return {
            "value": done,
            "elapsed": elapsed,
        }

    async def batch_llm_call(self, requests: list[str]) -> list[dict]:
        """
        并发执行所有 async 请求，等全部完成后返回结果（顺序稳定）
        """

        # 1. 初始化 results 容器
        results: list[dict | None] = [None] * len(requests)

        # 2. 创建任务列表 + idx 映射
        tasks: list[asyncio.Task] = []
        task_to_index: dict[asyncio.Task, int] = {}

        for idx, request in enumerate(requests):
            task = asyncio.create_task(self.process_request(request))
            tasks.append(task)
            task_to_index[task] = idx

        # 3. 等待所有 tasks 完成
        done, _ = await asyncio.wait(tasks)

        # 4. 聚合结果
        for task in done:
            idx = task_to_index[task]
            payload = task.result()   # {"value": ..., "elapsed": ...}

            results[idx] = {
                "result": payload["value"],
                "time": payload["elapsed"],
            }

        return results
    

    
    def create_batch_json(self, requests: list[str]):
    
        return 
    def create_batch_call(self, ):
        ...
 

async def main():
    serv = LlmServicePipe()
    #load json from file
    with open("../context_provider/raw.json", "r", encoding="utf-8") as f:
        items = json.load(f)
        result = await serv.batch_llm_call(
        #create alphabet from a to z
            [items[0]["content"]]
        )
        with open("result.json", "w", encoding="utf-8") as result_file:
            json.dump(result, result_file, indent=2)
if __name__ == "__main__":
    asyncio.run(main())


