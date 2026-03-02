import logging
import os
from typing import Any

from docling_core.transforms.chunker.hierarchical_chunker import TripletTableSerializer
from docling_core.transforms.serializer.markdown import MarkdownDocSerializer, MarkdownParams
from langchain_openai import OpenAIEmbeddings
from supabase import create_client

from src.pdf_backend.services.chonkie_chunker import process_pdf_to_chunks

logger = logging.getLogger(__name__)


class RagService:
    """
    Responsible for PDF content processing only:
    extract → chunk → embed → store to vector DB.

    Does NOT handle file storage or document record management.
    Those are the main backend's responsibility.
    """

    def __init__(self):
        self._embedding_model = None
        self._supabase = None

    def start(self):
        self._supabase = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SECRET_KEY"],
        )
        self._embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
        logger.info("RagService started")

    def _store_to_vector(
        self, document_id: str, project_id: str, chunks: list[Any]
    ) -> int:
        """Embed chunks and insert into the vector DB. Returns inserted count."""
        re = MarkdownDocSerializer(
            doc=chunks,
            table_serializer=TripletTableSerializer(),
            params=MarkdownParams(
                image_placeholder="<!-- demo picture placeholder -->",
                # ...
            ),
        )
        return re

    def process_sync(
        self,
        document_id: str,
        project_id: str,
        document_name: str,
        file_path: str,
        cores: int = 1,
        on_progress: callable = None,
    ) -> tuple[bool, int, str]:
        """
        Synchronous version for RQ workers.
        cores: forwarded to the parallel PDF extractor.
        on_progress: optional callback(pct: int) called during processing.
        """
        import asyncio
        logger.info("[%s] process_sync starting (cores=%d)", document_id, cores)
        return asyncio.get_event_loop().run_until_complete(
            self.process(
                document_id=document_id,
                project_id=project_id,
                document_name=document_name,
                file_path=file_path,
                cores=cores,
            )
        )

    async def process(
        self, document_id: str, project_id: str, document_name: str, file_path: str, cores: int = 1,
    ) -> tuple[bool, int, str]:
        """
        Full RAG pipeline for a PDF at file_path.
        Returns (success, chunk_count, message).
        file_path is a server-internal temp path, not part of the API contract.
        """
        from src.pdf_backend.schemas.rag import ProcessRequest

        try:
            logger.info("[%s] Starting extraction + chunking", document_id)
            chunks = await process_pdf_to_chunks(
                ProcessRequest(
                    document_id=document_id,
                    project_id=project_id,
                    document_name=document_name,
                ),
                file_path=file_path,
                cores=cores,
            )
            logger.info("[%s] Chunking done: %d chunks", document_id, len(chunks))
        except Exception as e:
            logger.exception(f"Chunking failed for document {document_id}: {e}")
            return False, 0, f"PDF extraction/chunking failed: {e}"

        if not chunks:
            return False, 0, "No content extracted from PDF"

        try:
            logger.info("[%s] Storing %d chunks to vector DB", document_id, len(chunks))
            # store chunks to vector DB and get the count of inserted records
            count = self._store_to_vector(document_id, project_id, chunks)
        except Exception as e:
            logger.exception(f"Vector storage failed for document {document_id}: {e}")
            return False, 0, f"Vector storage failed: {e}"

        return True, count, f"Successfully processed {count} chunks"
