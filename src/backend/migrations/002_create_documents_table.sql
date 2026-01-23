-- Migration: Create documents table for RAG vector storage
-- Description: Store document chunks with embeddings for similarity search
-- Date: 2026-01-20

-- Documents table for RAG
CREATE TABLE IF NOT EXISTS documents (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User isolation (critical for multi-tenant)
    user_id TEXT NOT NULL,

    -- Project isolation (for multi-project support)
    project_id TEXT NOT NULL,

    -- Source document info
    source_id UUID NOT NULL,
    source_name TEXT,
    source_dir TEXT,

    -- Content
    content TEXT NOT NULL,

    -- Embedding vector (1536 dimensions for text-embedding-3-small)
    embedding VECTOR(1536),

    -- Chunk metadata
    token_count INTEGER,
    start_index INTEGER,
    end_index INTEGER,
    page_numbers INTEGER[],

    -- Additional metadata (flexible JSON)
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying

-- Index for user isolation (most important - used in every query)
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_documents_source_id ON documents (source_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_documents_user_source ON documents (user_id, source_id);

-- Index for project filtering
CREATE INDEX IF NOT EXISTS idx_documents_user_project ON documents (user_id, project_id);

-- Vector similarity index (IVFFlat for approximate nearest neighbor)
-- lists = sqrt(n) where n is expected number of rows, 100 is good for up to 10k docs
DROP INDEX IF EXISTS idx_documents_embedding;

CREATE INDEX IF NOT EXISTS idx_documents_embedding
    ON documents
        USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) for user isolation
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own documents
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own documents" ON documents
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own documents" ON documents
    FOR DELETE USING (auth.uid()::text = user_id);
