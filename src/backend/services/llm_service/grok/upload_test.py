import asyncio
import os

import httpx
from dotenv import load_dotenv

from xai_sdk import AsyncClient
from xai_sdk.chat import user
from xai_sdk.proto import collections_pb2
from xai_sdk.tools import code_execution, collections_search

TESLA_10_Q_PDF_URL = "https://ir.tesla.com/_flysystem/s3/sec/000162828025045968/tsla-20250930-gen.pdf"
TESLA_10_K_PDF_URL = "https://ir.tesla.com/_flysystem/s3/sec/000162828025003063/tsla-20241231-gen.pdf"


async def main():
    load_dotenv()
    client = AsyncClient(api_key=os.getenv("XAI_API_KEY"), 
                         management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"))

    # Step 1: Create a collection for Tesla SEC filings

    # Step 2: Upload documents to the collection concurrently
    async def upload_document(
            url: str, name: str, collection_id: str, http_client: httpx.AsyncClient
    ) -> None:
        pdf_response = await http_client.get(url, timeout=30.0)
        pdf_content = pdf_response.content

        print(f"Uploading {name} document to collection")
        response = await client.collections.upload_document(
            collection_id=collection_id,
            name=name,
            data=pdf_content,
        )

        # Poll until document is processed and ready for search
        response = await client.collections.get_document(response.file_metadata.file_id, collection_id)
        print(f"Waiting for document {name} to be processed")
        while response.status != collections_pb2.DOCUMENT_STATUS_PROCESSED:
            await asyncio.sleep(3)
            response = await client.collections.get_document(response.file_metadata.file_id, collection_id)

        print(f"Document {name} processed")

    # Upload both documents concurrently
    async with httpx.AsyncClient() as http_client:
        await asyncio.gather(
            upload_document(TESLA_10_Q_PDF_URL, "tesla-10-Q-2024.pdf", "collection_977a9697-4c8d-44f9-91c6-8ba5974acb03", http_client),
            upload_document(TESLA_10_K_PDF_URL, "tesla-10-K-2024.pdf", "collection_977a9697-4c8d-44f9-91c6-8ba5974acb03", http_client),
        )

    # Step 3: Create a chat with collections search enabled
    chat = client.chat.create(
        model="grok-4-1-fast-reasoning",  # Use a reasoning model for better analysis
        tools=[
            collections_search(
                collection_ids=["collection_977a9697-4c8d-44f9-91c6-8ba5974acb03"],
            ),
            code_execution(),
        ],
        include=["verbose_streaming"],
    )

    # Step 4: Ask a complex analytical question that requires searching multiple documents
    chat.append(
        user(
            "How many consumer vehicles did Tesla produce in total in 2024 and 2025? "
            "Show your working and cite your sources."
        )
    )

    # Step 5: Stream the response and display reasoning progress
    is_thinking = True
    async for response, chunk in chat.stream():
        # View server-side tool calls as they happen
        for tool_call in chunk.tool_calls:
            print(f"\nCalling tool: {tool_call.function.name} with arguments: {tool_call.function.arguments}")
        if response.usage.reasoning_tokens and is_thinking:
            print(f"\rThinking... ({response.usage.reasoning_tokens} tokens)", end="", flush=True)
        if chunk.content and is_thinking:
            print("\n\nFinal Response:")
            is_thinking = False
        if chunk.content and not is_thinking:
            print(chunk.content, end="", flush=True)
        latest_response = response

    # Step 6: Review citations and tool usage
    print("\n\nCitations:")
    print(latest_response.citations)
    print("\n\nUsage:")
    print(latest_response.usage)
    print(latest_response.server_side_tool_usage)
    print("\n\nTool Calls:")
    print(latest_response.tool_calls)


if __name__ == "__main__":
    asyncio.run(main())