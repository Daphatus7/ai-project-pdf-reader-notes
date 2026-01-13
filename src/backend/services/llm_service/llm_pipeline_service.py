# @file        llm_pipeline_service.py
# @description 
# @author      [Peiyu Wang]
# @date        13/1/2026
# @license     © 2026 . All rights reserved.
import asyncio
import logging
import random
import time

from decorator import append
from openai import OpenAI
    

class LlmServicePipe:
    
    async def request_batch_llm_call(self, requests: list[str]):
        """
            this requests if current llm call exceeds the ratings of the system
            If it does, the requests will be hold on to a queue,
            If it does not, this will be sent to the batch_llm_call
        """
    async def llm_call_summary(self, request:str)->str:
        
    
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

    result = await serv.batch_llm_call(
        #create alphabet from a to z
        [f"{c}" for c in range(1, 10)]
    )
    for i in result:
        print(i) 
if __name__ == "__main__":
    asyncio.run(main())


