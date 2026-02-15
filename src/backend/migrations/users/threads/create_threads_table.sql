-- Migration: Create threads table
-- Description: Conversation threads table for organizing chat messages
-- Date: 2026-01-23
DROP TABLE IF EXISTS threads CASCADE;
CREATE TABLE IF NOT EXISTS threads (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Thread information
    title TEXT,
    thread_summary TEXT,
    
    -- Tracking
    last_message_at TIMESTAMPTZ,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

