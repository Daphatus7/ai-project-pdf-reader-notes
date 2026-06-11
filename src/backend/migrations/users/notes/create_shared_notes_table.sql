-- Migration: Create shared_notes table
-- Description: Physically isolated snapshot table for publicly shared notes.
--              The public (unauthenticated) API only ever queries this table,
--              so private notes are unreachable from unauthenticated traffic
--              even if the public query logic is flawed.
-- Date: 2026-06-11

CREATE TABLE IF NOT EXISTS shared_notes (
    -- Public URL identifier (secrets.token_urlsafe, unguessable)
    share_token TEXT PRIMARY KEY,

    -- One share per note; deleting the note deletes the share
    note_id UUID NOT NULL UNIQUE REFERENCES notes(id) ON DELETE CASCADE,

    -- Ownership for authorization checks only — never returned publicly
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Snapshot content (decoupled from notes; re-share to refresh)
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL DEFAULT '',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: enabled with NO policies. Backend uses service_role (bypasses RLS);
-- anon key gets zero access to this table.
ALTER TABLE shared_notes ENABLE ROW LEVEL SECURITY;
