# @file        llm_pipeline_service.py
# @description 
# @author      [Peiyu Wang]
# @date        13/1/2026
# @license     © 2026 . All rights reserved.
import asyncio
import json
import logging
import time
from dataclasses import dataclass

import dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.rate_limiters import InMemoryRateLimiter

RATE_PER_MINUTE = 5000.0
SEC_PER_MINUTE = 60.0
TOKEN_PER_MINUTE = 2000000
TOKEN_PER_DAY = 20000000

@dataclass
class PipelineRequest:
    content: str
    instruction: str

system_message ="""
                    You are a summarization engine.
                    Rules:
                    - Keep things brief and concise in 50 words max lesser if possible.
                    - focus on summarizing purpose
                    - briefly generalise content
                    - Do NOT add any preface.
                    - Do NOT say "Here is a summary" or similar.
                    - Output only the summary content.
                """ # todo to be updated and improved in the future



class LlmServicePipe:



    def __init__(self):
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
            timeout=100,
            rate_limiter=self.rate_limiter
        )
    
    
    async def request_batch_llm_call(self, requests: list[str]):
        """
            this requests if current llm call exceeds the ratings of the system
            If it does, the requests will be hold on to a queue,
            If it does not, this will be sent to the batch_llm_call
        """
    
    async def llm_call_summary(self, request: PipelineRequest)-> AIMessage:
        conversation = [
            SystemMessage(request.instruction),
            HumanMessage(request.content),
        ]   

        # 尝试最多 3 次
        max_attempts = 2
        for attempt in range(max_attempts):
            response = await self.model.ainvoke(conversation)

            # 检查是否成功（内容非空）
            if response.content:
                return response

            # 如果是最后一次尝试且仍然失败，返回原始请求
            if attempt == max_attempts - 1:
                logging.warning(f"All {max_attempts} attempts failed, returning original request")
                return AIMessage(content=request.content)

        # 理论上不会到这里，但为了类型安全
        return AIMessage(content=request.content)

    async def process_request(self, request: PipelineRequest) -> dict:
        start = time.perf_counter()
        msg = await self.llm_call_summary(request)
        elapsed = time.perf_counter() - start
        return {"value": msg, "elapsed": elapsed}


    async def batch_llm_call(self, requests: list[PipelineRequest]
                            ) -> list[dict]:
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
            ai_message = payload["value"]  # AIMessage 对象

            results[idx] = {
                "result": ai_message.content,  # 提取文本内容
                "source": requests[idx].content,  # 提取原始内容字符串
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
        
        # get the summary for the entire thing, and use the
        # total_summary = await serv.batch_llm_call(
        #     [
        #         PipelineRequest(
        #             "".join([item["content"] for item in items]),
        #             system_message
        #         )
        #     ]
        # )
        # 
        # with open("summary.json", "w", encoding="utf-8") as result_file:
        #     json.dump(total_summary[0], result_file, indent=2)
        # Final exam paper for COMP30024 AI (University of Melbourne, 2021). 7 questions (70% of grade), 3h15m. Topics cover search (DFS, A*, MRV/LCV, expectimax/minimax, alpha-beta), CSPs with arc-consistency and backtracking, bidirectional A*, auction/mechanism design, Bayesian networks, robotics configuration space, and a language/noise inference problem.
        
        
        
        additional_context = """
        Final exam paper for COMP30024 AI (University of Melbourne, 2021). 7 questions (70% of grade), 3h15m. Topics cover search (DFS, A*, MRV/LCV, expectimax/minimax, alpha-beta), CSPs with arc-consistency and backtracking, bidirectional A*, auction/mechanism design, Bayesian networks, robotics configuration space, and a language/noise inference problem.
        """
        # system_msg = f"""
        #     You are a summarization engine. 
        #     Rules:
        #     - Keep things brief and concise in 50 words max lesser if possible.
        #     - focus on summarizing purpose
        #     - document important facts such as title, topics, bullet points, annotation, question number, and so on.
        #     - Use ONLY information explicitly present in the input.
        #     - Do NOT infer, deduce, extrapolate, or assume anything not stated.
        #     - Do NOT generalize beyond the given facts.
        #     - Do NOT add any preface.
        #     - Do NOT say "Here is a summary" or similar.
        #     - Output only the summary content.
        #     And you are provided as knowledge context about the content, and use it for reference only. 
        #     Do not summarise the content inside context.
        #     <Context>
        #     {additional_context}
        #     <Context>
        # """
        system_msg = f"""
        You are a summarization engine for Retrieval-Augmented Generation (RAG).
        
        Your task is to generate a concise, faithful summary of the INPUT TEXT.
        You are also given CONTEXT for reference only — do NOT summarize or restate it.
        
        <REFERENCE CONTEXT>
        {additional_context}
        </REFERENCE CONTEXT>
        
        Rules:
        - Summarize ONLY the input text, not the reference context.
        - Output ONLY the summary text. No titles, no bullets, no quotes, no preface.
        - Maximum 50 words. Prefer 20–40 words when possible.
        - Focus on: purpose, scope, and key factual elements.
        - Preserve explicit facts if present: titles, section names, numbers, dates, constraints, identifiers.
        - Use ONLY information explicitly stated in the input.
        - Do NOT infer, deduce, extrapolate, generalize, or add interpretation.
        - Do NOT introduce examples, explanations, or implications.
        - If the input is vague, summarize the topic and intent without inventing details.
        - If information is missing or unclear, omit it — do not guess.
        
        Quality standard:
        - The summary must be suitable for retrieval/navigation, not for reasoning.
        - Prefer concrete terms from the text over abstract wording.
        """

        response = await serv.batch_llm_call(
            [ 
                PipelineRequest(
                            item["content"],
                            system_msg)
                for item in items]
        )
        with open("trash/result.json", "w", encoding="utf-8") as result_file:
            json.dump(response, result_file, indent=2)
if __name__ == "__main__":
    asyncio.run(main())


