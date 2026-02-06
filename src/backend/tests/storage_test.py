# @file        storage_test.py
# @description One-click script to load documents into Supabase
# @date        2026-01-20

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from langchain_openai import OpenAIEmbeddings
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# ============== CONFIG ==============
USER_ID = "test-user-001"

# Files to load (relative to backend directory)
FILES_TO_ADD = [
    "services/context_provider/pdf_extractor/exam21-final.json_chonkie_chunk.json",
    "services/context_provider/pdf_extractor/08-logisticregression.json_chonkie_chunk.json",
]

# Set to True to clear existing documents first
CLEAR_BEFORE_ADD = False
# ====================================


def main():
    # Init clients
    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    embedding_model = OpenAIEmbeddings(model="text-embedding-3-large")

    # Clear if needed
    if CLEAR_BEFORE_ADD:
        print(f"Clearing documents for user: {USER_ID}")
        supabase.table("documents").delete().eq("user_id", USER_ID).execute()

    # Process each file
    for file_path in FILES_TO_ADD:
        print(f"\n--- Processing: {file_path} ---")

        with open(file_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)
        print(f"Loaded {len(chunks)} chunks")

        # Generate embeddings
        texts = [c.get("content", "") for c in chunks]
        print("Generating embeddings...")
        embeddings = embedding_model.embed_documents(texts)

        # Build documents
        documents = []
        for chunk, emb in zip(chunks, embeddings):
            meta = chunk.get("metadata", {})
            documents.append({
                "user_id": USER_ID,
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
        response = supabase.table("documents").insert(documents).execute()
        print(f"Inserted {len(response.data)} documents")

    # Show summary
    print("\n--- Summary ---")
    result = supabase.table("documents").select("source_name").eq("user_id", USER_ID).execute()
    print(f"Total documents for {USER_ID}: {len(result.data)}")


if __name__ == "__main__":
    main()
