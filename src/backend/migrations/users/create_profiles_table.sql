-- Migration: Create profiles table
-- Description: User profile table for storing user basic information
-- Date: 2026-01-23

CREATE TABLE IF NOT EXISTS profiles (
    -- Primary key (matches auth.users.id)
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- User information
    display_name TEXT NOT NULL,
    user_id TEXT NOT NULL UNIQUE,
    
    -- User preferences
    preference JSONB DEFAULT '{}',
    
    -- Last opened project
    last_project_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 
-- -- Index for efficient user_id lookup
-- CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);
-- 
-- -- Trigger to auto-update updated_at
-- DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
-- CREATE TRIGGER profiles_updated_at
--     BEFORE UPDATE ON profiles
--     FOR EACH ROW
--     EXECUTE FUNCTION update_updated_at_column();
-- 
-- -- Row Level Security (RLS)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- 
-- -- Policy: Users can only see and modify their own profile
-- CREATE POLICY "Users can view own profile" ON profiles
--     FOR SELECT USING (auth.uid() = id);
-- 
-- CREATE POLICY "Users can insert own profile" ON profiles
--     FOR INSERT WITH CHECK (auth.uid() = id);
-- 
-- CREATE POLICY "Users can update own profile" ON profiles
--     FOR UPDATE USING (auth.uid() = id);
-- 
-- CREATE POLICY "Users can delete own profile" ON profiles
--     FOR DELETE USING (auth.uid() = id);
