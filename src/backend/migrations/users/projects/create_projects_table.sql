-- Migration: Create projects table
-- Description: Projects table for organizing user documents and conversations
-- Date: 2026-01-23

CREATE TABLE IF NOT EXISTS projects (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to profiles
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Project information
    name TEXT NOT NULL,
    description TEXT,

    -- xAI collection mapping (nullable: set after collection is created)
    xai_collection_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
