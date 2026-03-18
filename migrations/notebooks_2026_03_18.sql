-- Migration: Add notebooks support for note organisation
-- Date: 2026-03-18
-- Run in Supabase SQL Editor before deploying backend changes.

-- ==================== 1. Create notebooks table ====================

CREATE TABLE IF NOT EXISTS notebooks (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT        NOT NULL,
    name       TEXT        NOT NULL DEFAULT 'Untitled Notebook',
    color      TEXT,                         -- optional hex color for visual distinction
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== 2. Row-level security ====================

ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notebooks_owner_policy" ON notebooks
    FOR ALL
    USING  (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- ==================== 3. Add notebook_id to notes ====================

-- ON DELETE SET NULL: deleting a notebook uncategorises its notes, does not delete them
ALTER TABLE notes
    ADD COLUMN IF NOT EXISTS notebook_id UUID
    REFERENCES notebooks (id) ON DELETE SET NULL;

-- ==================== 4. Performance indexes ====================

CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON notebooks (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_notebook_id  ON notes (notebook_id);

-- ==================== 5. Auto-update updated_at trigger ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notebooks_updated_at
    BEFORE UPDATE ON notebooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
