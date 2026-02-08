-- One-time backfill: create user_usages rows for existing users with actual counts
INSERT INTO user_usages (user_id, project_count, doc_count, note_count, token_used)
SELECT
    p.id,
    COALESCE((SELECT COUNT(*)::INT FROM projects WHERE user_id = p.id), 0),
    COALESCE((SELECT COUNT(*)::INT FROM documents WHERE user_id = p.id), 0),
    COALESCE((SELECT COUNT(*)::INT FROM notes WHERE user_id = p.id), 0),
    COALESCE((SELECT SUM(token_count) FROM messages WHERE user_id = p.id), 0)
FROM profiles p
ON CONFLICT (user_id) DO NOTHING;
