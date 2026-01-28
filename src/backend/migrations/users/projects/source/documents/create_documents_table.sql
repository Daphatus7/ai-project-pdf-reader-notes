-- Migration: Create documents table for RAG vector storage
-- Description: Store document chunks with embeddings for similarity search
-- Date: 2026-01-20

-- Documents table for RAG
-- DROP TABLE IF EXISTS documents;

CREATE TABLE IF NOT EXISTS documents (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Keys
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Source document info
    document_name TEXT,
    document_dir TEXT,
    document_type TEXT,
    description TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Additional metadata (flexible JSON)
    metadata JSONB DEFAULT '{}'
);
