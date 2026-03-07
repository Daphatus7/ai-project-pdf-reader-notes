import os
import time
from collections.abc import Sequence

from dotenv import load_dotenv
from xai_sdk import Client
from xai_sdk.proto.v6.documents_pb2 import SearchResponse

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
    def search_collection(self,selected_files: Sequence[str], query: str) -> SearchResponse:
        """
        :param query: 
        :param selected_files: 
        :return: 
        """
        results = self.xai_client.collections.search(
            query=query,
            collection_ids=selected_files, #user selected ids
            retrieval_mode="hybrid",
        )
        return results
    
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
    
    
    
# if __name__ == "__main__":
#     grok_collection = GrokCollection()
#     # test upload file
#     file = client.files.upload("/path/to/your/document.pdf")