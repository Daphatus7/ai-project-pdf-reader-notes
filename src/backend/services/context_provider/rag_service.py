# @file        rag_service.py
# @description 
# @author      [Peiyu Wang]
# @date        21/1/2026
# @license     © 2026 . All rights reserved.
import os

from attr.setters import validate
from langchain_openai import OpenAIEmbeddings
from supabase import create_client

from src.backend.schemas.rag import RagRequest, RagDeleteRequest, RagDeleteResponse
from src.backend.services.context_provider.chonkie_chunker import chonkie_chunk
from src.backend.services.service import Service


class RagService(Service):
    def __init__(self):
        self.embedding_model = None
        self.supabase = None

    def start(self):
        self.supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
        self.embedding_model = OpenAIEmbeddings(model="text-embedding-3-large")

    def get(self):
        return self

    def validate_input(self, rag_request: RagRequest):
        return

    def store(self, rag_request: RagRequest, chonkie: list[dict]):
        # Process each file
        # Generate embeddings
        texts = [c.get("content", "") for c in chonkie]
        print("Generating embeddings...")
        embeddings = self.embedding_model.embed_documents(texts)

        # Build documents
        documents = []
        for chunk, emb in zip(chonkie, embeddings):
            meta = chunk.get("metadata", {})
            documents.append({
                "user_id": rag_request.user_id,
                "project_id": rag_request.project_id,
                "source_id": meta.get("source_id"),
                "source_name": meta.get("source_name"),
                "content": chunk.get("content", ""),
                "embedding": emb,
                "metadata": {
                    "token_count": meta.get("token_count"),
                    "page_numbers": meta.get("page_number", []),
                }
            })

        # Insert
        response = self.supabase.table("documents").insert(documents).execute()
        print(f"Inserted {len(response.data)} documents")
    
        # Show summary
        print("\n--- Summary ---")
        result = self.supabase.table("documents").select("source_name").eq("user_id", rag_request.user_id).execute()
        print(f"Total documents for {rag_request.user_id}: {len(result.data)}")

    def delete(self, rag_delete: RagDeleteRequest) -> RagDeleteResponse:
        ...
    def process(self, rag_request: RagRequest):
        """
            Process incoming pdf file and process to vector database
            rag_request: 
        """
        # check if the incoming file is a valid input, should be able to support different data inputs, but for now
        # we will be working on pdf format only, and reject other types and return failure and throwing errors.
        try:
            if self.validate_input(rag_request):
                # the input is validate(pdf for now) it will be extract to text form.
                chonkie = chonkie_chunk(rag_request)
                if chonkie:
                    try:
                        self.store(rag_request, chonkie)
                    except:
    
    