-- Migration: Enable Row Level Security for note_assets table
-- Description: Protect note image assets at the database level.
--              Backend uses service_role_key which bypasses RLS.
--              These policies protect against direct access via anon key.
-- Date: 2026-02-19

ALTER TABLE note_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own note assets"
    ON note_assets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own note assets"
    ON note_assets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own note assets"
    ON note_assets FOR DELETE
    USING (auth.uid() = user_id);
