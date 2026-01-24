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
        self.supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
        self.embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")

    def get(self):
        return self

    def validate_input(self, rag_request: RagRequest) -> bool:
        """Validate the input request. MVP: check file exists."""
        if not rag_request.file_dir:
            return False
        if not os.path.exists(rag_request.file_dir):
            return False
        return True

    def store(self, rag_request: RagRequest, chunks: list[dict]) -> int:
        """Store chunks with embeddings in Supabase. Returns count of inserted docs."""
        texts = [c.get("content", "") for c in chunks]
        logger.info(f"Generating embeddings for {len(texts)} chunks...")
        embeddings = self.embedding_model.embed_documents(texts)

        documents = []
        for chunk, emb in zip(chunks, embeddings):
            meta = chunk.get("metadata", {})
            documents.append({
                "user_id": rag_request.user_id,
                "project_id": rag_request.project_id,
                "source_id": meta.get("source_id"),
                "source_name": meta.get("source_name"),
                "content": chunk.get("content", ""),
                "embedding": emb,
                "token_count": meta.get("token_count"),
                "page_numbers": meta.get("page_number", []),
                "metadata": {}
            })

        response = self.supabase.table("documents_chunks").insert(documents).execute()
        inserted_count = len(response.data) if response.data else 0
        logger.info(f"Inserted {inserted_count} documents for user {rag_request.user_id}")
        return inserted_count

    def delete(self, rag_delete: RagDeleteRequest) -> RagDeleteResponse:
        """Delete documents by source_id for a user."""
        try:
            self.supabase.table("document_chunks").delete().eq(
                "user_id", rag_delete.user_id
            ).eq(
                "source_id", rag_delete.source_id
            ).execute()
            return RagDeleteResponse(success=True, message="Deleted successfully")
        except Exception as e:
            logger.exception(f"Delete failed: {e}")
            return RagDeleteResponse(success=False, message=str(e))

    def process(self, rag_request: RagRequest) -> UploadResponse:
        """
        Process incoming pdf file and store to vector database.
        Returns UploadResponse with status.
        """
        # Validate input
        if not self.validate_input(rag_request):
            return UploadResponse(
                success=False,
                message="Invalid input: file not found or invalid request"
            )

        # Extract and chunk
        try:
            chunks = chonkie_chunk(rag_request)
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

        # Store to vector database
        try:
            inserted_count = self.store(rag_request, chunks)
        except Exception as e:
            logger.exception(f"Storage failed: {e}")
            return UploadResponse(
                success=False,
                source_id=source_id,
                message=f"Database storage failed: {str(e)}"
            )

        return UploadResponse(
            success=True,
            source_id=source_id,
            chunk_count=inserted_count,
            message=f"Successfully processed and stored {inserted_count} chunks"
        )            
    
    