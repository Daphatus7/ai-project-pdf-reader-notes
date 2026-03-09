import os
import time
from collections.abc import Sequence

from dotenv import load_dotenv
from xai_sdk import Client
from xai_sdk.proto.v6.documents_pb2 import SearchResponse, SearchMatch

import logging

logger = logging.getLogger(__name__)

# xAI DocumentStatus protobuf enum integer values.
# SDK's wait_for_indexing=True crashes on UNSPECIFIED(0) — this is a known SDK bug.
_DOC_STATUS_UNSPECIFIED = 0   # queued, not yet started
_DOC_STATUS_PROCESSING = 1    # indexing in progress
_DOC_STATUS_PROCESSED = 2     # ready for search
_DOC_STATUS_FAILED = 3        # indexing failed


class GrokCollection:

    def __init__(self):
        load_dotenv()
        self.xai_client = Client(
            management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
            api_key=os.getenv("XAI_API_KEY"),
            timeout=3600,
        )

    def create_collection(self, project_id: str) -> str:
        """Create an xAI Collection for a project. Returns the xAI collection_id."""
        collection = self.xai_client.collections.create(
            name=project_id,
            model_name="grok-embedding-small",
        )
        logger.info(f"Created xAI collection for project={project_id} collection_id={collection.collection_id}")
        return collection.collection_id

    def upload_document(self, collection_id: str, name: str, data: bytes,
                        timeout_minutes: int = 5, poll_interval_seconds: int = 5):
        try:
            # Use wait_for_indexing=False to bypass SDK bug:
            # SDK's _wait_for_indexing_to_complete raises ValueError on DOCUMENT_STATUS_UNSPECIFIED(0),
            # which is the initial status right after AddDocumentToCollection.
            document = self.xai_client.collections.upload_document(
                collection_id=collection_id,
                name=name,
                data=data,
                wait_for_indexing=False,
            )
            logger.info(f"Uploaded document={name} to xai_collection_id={collection_id}, starting indexing poll")

            # Manual polling: correctly handles UNSPECIFIED(0) and PROCESSING(1) as "keep waiting"
            file_id = document.file_metadata.file_id
            deadline = time.time() + timeout_minutes * 60

            while time.time() < deadline:
                doc_meta = self.xai_client.collections.get_document(
                    file_id=file_id,
                    collection_id=collection_id,
                )
                status = doc_meta.status

                if status == _DOC_STATUS_PROCESSED:
                    logger.info(f"Document={name} indexed successfully (file_id={file_id})")
                    return doc_meta
                elif status == _DOC_STATUS_FAILED:
                    logger.error(f"Document={name} indexing failed: {doc_meta.error_message}")
                    raise ValueError(f"Document indexing failed: {doc_meta.error_message}")
                elif status in (_DOC_STATUS_UNSPECIFIED, _DOC_STATUS_PROCESSING):
                    # UNSPECIFIED = queued but not yet started; PROCESSING = indexing in progress
                    logger.debug(f"Document={name} status={status}, waiting {poll_interval_seconds}s...")
                    time.sleep(poll_interval_seconds)
                else:
                    raise ValueError(f"Document={name} unknown status={status}")

            raise TimeoutError(f"Document={name} indexing timed out after {timeout_minutes} minutes")
        except Exception as e:
            logger.error(f"upload document got error ->>>>{e}")
    def search_collection(self, collection_id: str, selected_files: Sequence[str], query: str) -> list[SearchMatch]:
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
        results = self.xai_client.collections.search(
            query=query,
            collection_ids=[collection_id], #user selected ids
            retrieval_mode="hybrid",
        )
        #only return the reuslts from the selected files
        filtered_matches = [item for item in results.matches if item.file_id in selected_files]
        # return top 5 results and the results will be included in the context for answer generation
        return filtered_matches[:5]

    def delete_collection(self,collection_id: str):
        """
            删除整个collection文件夹, 包括里面的文件
        :param collection_id: 
        :return: nothing
        """
        self.xai_client.collections.delete(collection_id)

    def delete_document(self,document_id: str):
        """
            无视文件的删除
        """
        response = self.xai_client.files.delete(
            document_id
        )
        return response

    def list_files(self, limit: int = 100) -> list[dict]:
        """List all files uploaded to xAI. Useful for debugging upload status."""
        response = self.xai_client.files.list(limit=limit)
        return [
            {"id": f.id, "filename": f.filename, "size": f.size, "created_at": str(f.created_at)}
            for f in response.data
        ]

    def get_file(self, file_id: str) -> dict:
        """Get metadata for a specific xAI file by ID."""
        f = self.xai_client.files.get(file_id)
        return {"id": f.id, "filename": f.filename, "size": f.size, "created_at": str(f.created_at)}

    def download_document(self,document_id: str):
        """
            下载文件内容
            Download the actual content of a file.
        :param document_id: 
        :return: 
        """
        response = self.xai_client.files.content(
            document_id
        )
        return response



if __name__ == "__main__":
    grok_collection = GrokCollection()
    # test upload file: read example.pdf from disk and upload to the collection
    path = "example.pdf"
    with open(path, "rb") as f:
        data = f.read()
    resp = grok_collection.upload_document(
        collection_id="collection_80100614-300c-4609-959b-a138fa90f542",
        name="example.pdf",
        data=data,
    )

    print(resp)
    
        