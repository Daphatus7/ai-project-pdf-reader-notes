-- Migration: Create documents table for RAG vector storage
-- Description: Store document chunks with embeddings for similarity search
-- Date: 2026-01-20

-- Documents table for RAG
-- DROP TABLE IF EXISTS documents;

CREATE TABLE IF NOT EXISTS document_chunks (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- foreign keys
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Content
    content TEXT NOT NULL,

    -- Embedding vector (1536 dimensions for text-embedding-3-small)
    embedding VECTOR(1536),

    -- Chunk metadata
    token_count INTEGER,
    start_index INTEGER,
    end_index INTEGER,
    page_numbers INTEGER[],

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
