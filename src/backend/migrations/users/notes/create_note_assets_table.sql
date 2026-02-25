-- Migration: Create note_assets table
-- Description: Tracks images uploaded to Supabase Storage for each note,
--              enabling clean lifecycle management without markdown parsing.
-- Date: 2026-02-19

CREATE TABLE IF NOT EXISTS note_assets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id      UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    url          TEXT NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_assets_note_id ON note_assets(note_id);
CREATE INDEX IF NOT EXISTS idx_note_assets_user_id ON note_assets(user_id);
