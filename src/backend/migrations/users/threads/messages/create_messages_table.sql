-- Migration: Create messages table
-- Description: Messages table for storing conversation history
-- Date: 2026-01-23
DROP TABLE IF EXISTS messages;
CREATE TABLE IF NOT EXISTS messages (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    
    -- Message content
    role TEXT NOT NULL,
    content JSONB NOT NULL,
    
    -- Message threading
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_role CHECK (role IN ('user', 'assistant', 'system'))
);
