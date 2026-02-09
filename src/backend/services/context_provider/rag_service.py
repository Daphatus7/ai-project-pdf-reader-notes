# @file        rag_service.py
# @description
# @author      [Peiyu Wang]
# @date        21/1/2026
# @license     © 2026 . All rights reserved.
import logging
import os

from langchain_openai import OpenAIEmbeddings
from supabase import create_client

from src.backend.schemas.rag import RagRequest, RagDeleteRequest, RagDeleteResponse, UploadResponse
from src.backend.services.context_provider.chonkie_chunker import chonkie_chunk
from src.backend.services.service import Service

logger = logging.getLogger(__name__)

class RagService(Service):
    def __init__(self):
        self.embedding_model = None
        self.supabase = None

    def start(self):
        self.supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])
        self.embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")

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

    def store_to_vector(self, rag_request: RagRequest,
                        document_id:str,
                        chunks: list[dict]) -> int:
        """Store chunks with embeddings in Supabase. Returns count of inserted docs."""
        # content the of the chunks is embedded
        texts = [c.get("content", "") for c in chunks]
        logger.info(f"Generating embeddings for {len(texts)} chunks...")
        embeddings = self.embedding_model.embed_documents(texts)
        
        #store to json for debugging 
        with open("embeddings_debug.json", "w") as f:
            import json
            json.dump(chunks, f)
        
        documents = []
        for chunk, emb in zip(chunks, embeddings):
            meta = chunk.get("metadata", {})
            documents.append({
                #id created by supabase
                "document_id": document_id,
                "project_id": rag_request.project_id,
                "content": chunk.get("content", ""),
                "embedding": emb,
                "token_count": meta.get("token_count"),
                "start_index": meta.get("start_index"),
                "end_index": meta.get("end_index"),
                "page_numbers": meta.get("page_number", []),
            })

        response = self.supabase.table("document_chunks").insert(documents).execute()
        inserted_count = len(response.data) if response.data else 0
        logger.info(f"Inserted {inserted_count} documents for user {rag_request.user_id}")
        return inserted_count

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
        

    async def chunking_document(self, rag_request: RagRequest) -> UploadResponse:
        """
        Process incoming pdf file and store to vector database.
        Returns UploadResponse with status.
        """
        
        # Extract and chunk
        try:
            chunks = await chonkie_chunk(rag_request)
        except Exception as e:
            logger.exception(f"Chunking failed: {e}")
            return UploadResponse(
                success=False,
                message=f"PDF extraction/chunking failed: {str(e)}"
            )

        if not chunks:
            return UploadResponse(
                success=False,
                message="No content extracted from PDF"
            )

        # Get source_id from first chunk metadata
        source_id = chunks[0].get("metadata", {}).get("source_id")

        # Create document record
        try:
            response = await self.create_document_table(rag_request)
            document_id = response.data[0]['id']
        except Exception as e:
            logger.exception(f"Failed to create document table entry: {e}")
            return UploadResponse(
                success=False,
                source_id=source_id,
                message=f"Failed to create document record: {str(e)}"
            )

        # Upload PDF to Supabase Storage for later viewing
        try:
            storage_path = self.upload_to_storage(
                rag_request.document_dir, rag_request.user_id, document_id
            )
            self.supabase.table("documents").update({
                "document_dir": storage_path
            }).eq("id", document_id).execute()
        except Exception as e:
            # Rollback document record
            self.supabase.table("documents").delete().eq("id", document_id).execute()
            logger.exception(f"Storage upload failed: {e}")
            return UploadResponse(
                success=False,
                source_id=source_id,
                message=f"PDF storage failed: {str(e)}"
            )

        # Store vector embeddings
        try:
            inserted_count = self.store_to_vector(rag_request, document_id, chunks)
        except Exception as e:
            logger.exception(f"Vector storage failed: {e}")
            return UploadResponse(
                success=False,
                source_id=source_id,
                message=f"Vector storage failed: {str(e)}"
            )

        return UploadResponse(
            success=True,
            source_id=source_id,
            chunk_count=inserted_count,
            message=f"Successfully processed and stored {inserted_count} chunks"
        )            
    
    