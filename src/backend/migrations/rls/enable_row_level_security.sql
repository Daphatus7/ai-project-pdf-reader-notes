-- Migration: Enable Row Level Security for all tables
-- Description: Protect all user data at the database level
-- Date: 2026-02-09
--
-- Note: Backend uses service_role_key which bypasses RLS.
-- These policies protect against direct access via anon key.

-- ============================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. PROFILES (id = auth.uid())
-- ============================================================

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
    ON profiles FOR DELETE
    USING (auth.uid() = id);

-- ============================================================
-- 3. USER_USAGES (read-only via policy, writes via RPC)
-- ============================================================

CREATE POLICY "Users can view own usage"
    ON user_usages FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================
-- 4. PROJECTS
-- ============================================================

CREATE POLICY "Users can view own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 5. DOCUMENTS
-- ============================================================

CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
    ON documents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
    ON documents FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 6. DOCUMENT_CHUNKS (via subquery through documents)
-- ============================================================

CREATE POLICY "Users can view own document chunks"
    ON document_chunks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_chunks.document_id
          AND documents.user_id = auth.uid()
    ));

CREATE POLICY "Users can create own document chunks"
    ON document_chunks FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_chunks.document_id
          AND documents.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own document chunks"
    ON document_chunks FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_chunks.document_id
          AND documents.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own document chunks"
    ON document_chunks FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_chunks.document_id
          AND documents.user_id = auth.uid()
    ));

-- ============================================================
-- 7. NOTES
-- ============================================================

CREATE POLICY "Users can view own notes"
    ON notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes"
    ON notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
    ON notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 8. THREADS
-- ============================================================

CREATE POLICY "Users can view own threads"
    ON threads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own threads"
    ON threads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads"
    ON threads FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads"
    ON threads FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 9. MESSAGES
-- ============================================================

CREATE POLICY "Users can view own messages"
    ON messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
    ON messages FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
    ON messages FOR DELETE
    USING (auth.uid() = user_id);
