import logging
import os
from typing import Any

from supabase import create_client, Client as SupabaseClient
from xai_sdk import Client

from src.backend.schemas.rag import RagRequest, RagDeleteRequest, RagDeleteResponse, UploadResponse
from src.backend.services.service import Service

logger = logging.getLogger(__name__)

class RagService(Service):
    def __init__(self):
        self.supabase: SupabaseClient | None = None
        self._xai_client: Client | None = None

    def start(self):
        self.supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])
        self._xai_client = Client(
            api_key=os.getenv("XAI_API_KEY"),
            management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
        )

    def get(self):
        return self

    def upload_to_storage(self, file_path: str, user_id: str, document_id: str) -> str:
        """Upload PDF to Supabase Storage and return the storage path."""
        storage_path = f"{user_id}/documents/{document_id}.pdf"
        with open(file_path, 'rb') as f:
            file_data = f.read()
        (self.supabase.storage.from_('docs').upload(
            path=storage_path,
            file=file_data,
            file_options={"content-type": "application/pdf"}
        ))
        logger.info(f"Uploaded PDF to storage: {storage_path}")
        return storage_path

    def validate_input(self, rag_request: RagRequest) -> bool:
        """Validate the input request. MVP: check file exists."""
        if not rag_request.document_dir:
            return False
        if not os.path.exists(rag_request.document_dir):
            return False
        return True


    def upload_to_collection(self, project_id: str, document_id: str, document_name: str, file_data: bytes) -> None:
        """Upload PDF to xAI Collection for RAG. xAI handles chunking and embedding.

        project_id = collection_id, document_id = document identifier in the collection.
        """
        
        
        self._xai_client.collections.upload_document(
            collection_id=project_id,
            data=file_data,
        )
        logger.info(f"Uploaded to xAI collection={project_id} document={document_id}")

    async def create_document_table(self, rag_request: RagRequest)-> None:
        """
            create a table for document summary
        :param rag_request: 
        :return: 
        """
        try:
            response = self.supabase.table("documents").insert({
                "user_id": rag_request.user_id,
                "project_id": rag_request.project_id,
                "document_name": rag_request.document_name,
                "document_dir": rag_request.document_dir,
                "description": "to be added in the future",
            }).execute()
            logger.info(f"Document table created for user {rag_request.user_id}, project {rag_request.project_id}")
            return response
        except Exception as e:
            logger.exception(f"Failed to create document table: {e}")
            raise e
        
    async def upload_document(self, rag_request: RagRequest) -> UploadResponse:
        """Upload PDF to Supabase Storage (for viewing) and xAI Collection (for RAG).

        project_id = xAI collection_id, document_id (Supabase) = xAI document identifier.
        """
        # Create document record
        try:
            response = await self.create_document_table(rag_request)
            document_id = response.data[0]['id']
        except Exception as e:
            logger.exception(f"Failed to create document record: {e}")
            return UploadResponse(success=False, message=f"Failed to create document record: {str(e)}")

        # Upload PDF to Supabase Storage for viewing
        try:
            storage_path = self.upload_to_storage(
                rag_request.document_dir, rag_request.user_id, document_id
            )
            self.supabase.table("documents").update({
                "document_dir": storage_path
            }).eq("id", document_id).execute()
        except Exception as e:
            self.supabase.table("documents").delete().eq("id", document_id).execute()
            logger.exception(f"Supabase storage upload failed: {e}")
            return UploadResponse(success=False, message=f"PDF storage failed: {str(e)}")

        # Upload PDF to xAI Collection for RAG (project_id = collection_id)
        try:
            with open(rag_request.document_dir, "rb") as f:
                file_data = f.read()
            self.upload_to_collection(rag_request.project_id, document_id, rag_request.document_name, file_data)
        except Exception as e:
            logger.exception(f"xAI collection upload failed: {e}")
            return UploadResponse(success=False, message=f"xAI collection upload failed: {str(e)}")

        return UploadResponse(
            success=True,
            source_id=document_id,
            message="Document uploaded successfully",
        )
