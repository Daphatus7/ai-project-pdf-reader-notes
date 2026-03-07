import os
from collections.abc import Sequence

from dotenv import load_dotenv
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.proto.v6.documents_pb2 import SearchResponse

#load env
import logging

logger = logging.getLogger(__name__)


class GrokCollection:

    def __init__(self):
        load_dotenv()
        self.xai_client = Client(
            management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
            api_key=os.getenv("XAI_API_KEY"),
        )

    def create_collection(self, project_id: str) -> str:
        """Create an xAI Collection for a project. Returns the xAI collection_id."""
        collection = self.xai_client.collections.create(
            name=project_id,
            model_name="grok-embedding-small",
        )
        logger.info(f"Created xAI collection for project={project_id} collection_id={collection.collection_id}")
        return collection.collection_id
        
    def upload_document(self, collection_id: str, name: str, data: bytes):
        try:
            document = self.xai_client.collections.upload_document(
                collection_id=collection_id,
                name=name,
                data=data,
            )
            logger.info(f"Uploaded document={name} to xai_collection_id={collection_id}")
            return document
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
    
    
    
    
