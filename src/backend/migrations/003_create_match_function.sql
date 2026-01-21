-- Migration: Create match_documents function for RAG similarity search
-- Description: RPC function for vector similarity search with user/source filtering
-- Date: 2026-01-20

-- Main search function for RAG
-- Prefilters by user_id and source_ids BEFORE vector search (efficient)

CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(3072),
    match_count INT DEFAULT 4,
    filter_user_id TEXT DEFAULT NULL,
    filter_project_id TEXT DEFAULT NULL,
    filter_source_ids UUID[] DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (
    id UUID,
    user_id TEXT,
    project_id TEXT,
    source_id UUID,
    source_name TEXT,
    content TEXT,
    token_count INTEGER,
    page_numbers INTEGER[],
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.user_id,
        d.project_id,
        d.source_id,
        d.source_name,
        d.content,
        d.token_count,
        d.page_numbers,
        d.metadata,
        (1 - (d.embedding <=> query_embedding))::FLOAT AS similarity
    FROM documents d
    WHERE
        -- User filter (required for multi-tenant isolation)
        (filter_user_id IS NULL OR d.user_id = filter_user_id)
        -- Project filter (optional)
        AND (filter_project_id IS NULL OR d.project_id = filter_project_id)
        -- Source filter (optional)
        AND (filter_source_ids IS NULL OR d.source_id = ANY(filter_source_ids))
        -- Similarity threshold filter
        AND (1 - (d.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_documents TO authenticated;
GRANT EXECUTE ON FUNCTION match_documents TO service_role;

-- Helper function: Get documents by source
CREATE OR REPLACE FUNCTION get_documents_by_source(
    p_user_id TEXT,
    p_source_id UUID
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    token_count INTEGER,
    page_numbers INTEGER[],
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.content,
        d.token_count,
        d.page_numbers,
        d.created_at
    FROM documents d
    WHERE d.user_id = p_user_id
      AND d.source_id = p_source_id
    ORDER BY d.start_index;
END;
$$;

GRANT EXECUTE ON FUNCTION get_documents_by_source TO authenticated;
GRANT EXECUTE ON FUNCTION get_documents_by_source TO service_role;

-- Helper function: Delete documents by source (for re-upload)
CREATE OR REPLACE FUNCTION delete_documents_by_source(
    p_user_id TEXT,
    p_source_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM documents
    WHERE user_id = p_user_id AND source_id = p_source_id;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_documents_by_source TO authenticated;
GRANT EXECUTE ON FUNCTION delete_documents_by_source TO service_role;
