import asyncio
import os
from collections.abc import Sequence

import httpx
from dotenv import load_dotenv
from xai_sdk import AsyncClient
from xai_sdk.proto import collections_pb2
from xai_sdk.proto.v6.documents_pb2 import SearchMatch

import logging

logger = logging.getLogger(__name__)


class GrokCollection:

    def __init__(self):
        load_dotenv()
        self.xai_client = AsyncClient(
            management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
            api_key=os.getenv("XAI_API_KEY"),
            timeout=600,
        )
        self.http_client=httpx.AsyncClient()

    async def create_collection(self, project_id: str) -> str:
        """Create an xAI Collection for a project. Returns the xAI collection_id."""
        collection = await self.xai_client.collections.create(
            name=project_id,
            model_name="grok-embedding-small",
        )
        logger.info(f"Created xAI collection for project={project_id} collection_id={collection.collection_id}")
        return collection.collection_id

    async def upload_document(self, data, name: str, collection_id: str) -> str:
        """Fetch PDF from Supabase URL, upload to xAI collection, poll until processed.
        Returns xAI file_id for storing in DB.
        """
        logger.info(f"Uploading {name} to collection {collection_id}")
        response = await self.xai_client.collections.upload_document(
            collection_id=collection_id,
            name=name,
            data=data,
        )
        file_id = response.file_metadata.file_id
        # Poll until document is processed and ready for search
        doc = await self.xai_client.collections.get_document(file_id, collection_id)
        logger.info(f"Waiting for document {name} to be processed")
        while doc.status != collections_pb2.DOCUMENT_STATUS_PROCESSED:
            await asyncio.sleep(3)
            doc = await self.xai_client.collections.get_document(file_id, collection_id)
        logger.info(f"Document {name} processed, xai_file_id={file_id}")
        return file_id

    async def search_collection(self, collection_id: str, selected_files: Sequence[str], query: str) -> list[SearchMatch]:
        """
        Post
            {
                "query": "What is the revenue in the last quarter?",
                "source": {
                    "collection_ids": [
                    "collection_80100614-300c-4609-959b-a138fa90f542"
                    ]
                },
                "filter": "document_type = \"financial_report\" AND year > 2020"
            }
        Response 
            {
                "matches": [
                    {
                        "file_id": "file_ac3c5728-7399-41fc-bd62-0fef0042de9c",
                        "chunk_id": "0199717c-511b-7a80-bab3-dfe9a27f82ab",
                        "chunk_content": ", deferred revenue related to such customer payments amounted to $2.10 billion and $1.77 billion, respectively, mainly due to contractual payment terms. Revenue recognized from the deferred revenue balances as of December 31, 2024 and 2023 was $944 million and $873 million for the six months ended June 30, 2025 and 2024, respectively. We have elected the practical expedient to omit disclosure of the amount of the transaction price allocated to remaining performance obligations for contracts with an original expected contract length of one year or less. As of June 30, 2025, total transaction price allocated to performance obligations that were unsatisfied or partially unsatisfied for contracts with an original expected length of more than one year was $10.38 billion. Of this amount, we expect to recognize $5.47 billion in the next 12 months and the rest over the remaining performance obligation period. Changes in government and economic incentives or tariffs may impact the transaction price or our ability to e",
                        "score": 1.1447691,
                        "collection_ids": [
                            "collection_80100614-300c-4609-959b-a138fa90f542"
                            ]
                    }
                ]
            }
        :param collection_id: 
        :param query: 
        :param selected_files: 
        :return: 只返回1，file_id == selected_files中的文件；2，返回的结果数量限制在5条以内；3，返回的结果会被包含在后续的answer generation的context中
        """

        # instructions = f"only search the named files: {selected_files}"
        # print(f"given the instruction{instructions}")
        results = await self.xai_client.collections.search(
            query=query,
            collection_ids=[collection_id], #user selected ids
            retrieval_mode="hybrid",
        )
        #only return the reuslts from the selected files
        filtered_matches = [item for item in results.matches if item.file_id in selected_files]
        # return top 5 results and the results will be included in the context for answer generation
        return filtered_matches[:5]

    async def delete_collection(self,collection_id: str):
        """
            删除整个collection文件夹, 包括里面的文件
        :param collection_id: 
        :return: nothing
        """
        await self.xai_client.collections.delete(collection_id)

    async def delete_document(self,document_id: str):
        """
            无视文件的删除
        """
        response = await self.xai_client.files.delete(
            document_id
        )
        return response

    async def list_files(self, limit: int = 100) -> list[dict]:
        """List all files uploaded to xAI. Useful for debugging upload status."""
        response = await self.xai_client.files.list(limit=limit)
        return [
            {"id": f.id, "filename": f.filename, "size": f.size, "created_at": str(f.created_at)}
            for f in response.data
        ]

    async def get_file(self, file_id: str) -> dict:
        """Get metadata for a specific xAI file by ID."""
        f = await self.xai_client.files.get(file_id)
        return {"id": f.id, "filename": f.filename, "size": f.size, "created_at": str(f.created_at)}

    async def download_document(self,document_id: str):
        """
            下载文件内容
            Download the actual content of a file.
        :param document_id: 
        :return: 
        """
        response = await self.xai_client.files.content(
            document_id
        )
        return response

# if __name__ == "__main__":
#     grok_collection = GrokCollection()
#     # test upload file
#     instruction = "file_id='file_c8b7f818-e4c8-44e8-8073-19dd7b77bd61'"
#     response = grok_collection.search_collection(
#         collection_id="collection_58e69554-1cc5-4388-92b4-8bad7385c45b",
#         selected_files=["file_c8b7f818-e4c8-44e8-8073-19dd7b77bd61"],
#         query="what is in the maribynong city council during 2025-2028?",
#     )
#     
    
        