-- Migration: Create notes table
-- Description: Notes table for storing user-generated notes
-- Date: 2026-01-23

CREATE TABLE IF NOT EXISTS notes (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- MyNotePage content
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL DEFAULT '',
    summary TEXT,
    
    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
