-- User usage tracking table + atomic RPC functions

CREATE TABLE IF NOT EXISTS user_usages (
    user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    project_count INT NOT NULL DEFAULT 0,
    doc_count     INT NOT NULL DEFAULT 0,
    note_count    INT NOT NULL DEFAULT 0,
    token_used    BIGINT NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Atomic check-and-increment: returns {allowed, current}
-- Self-healing: upserts row if missing
CREATE OR REPLACE FUNCTION check_and_increment(
    p_user_id UUID,
    p_field TEXT,
    p_limit INT
) RETURNS JSON
LANGUAGE plpgsql AS $$
DECLARE
    v_current INT;
BEGIN
    -- Ensure row exists
    INSERT INTO user_usages (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Atomic check + increment
    IF p_field = 'project_count' THEN
        UPDATE user_usages SET project_count = project_count + 1, updated_at = NOW()
        WHERE user_id = p_user_id AND project_count < p_limit
        RETURNING project_count INTO v_current;
    ELSIF p_field = 'doc_count' THEN
        UPDATE user_usages SET doc_count = doc_count + 1, updated_at = NOW()
        WHERE user_id = p_user_id AND doc_count < p_limit
        RETURNING doc_count INTO v_current;
    ELSIF p_field = 'note_count' THEN
        UPDATE user_usages SET note_count = note_count + 1, updated_at = NOW()
        WHERE user_id = p_user_id AND note_count < p_limit
        RETURNING note_count INTO v_current;
    END IF;

    IF v_current IS NULL THEN
        -- Limit reached, get current value
        EXECUTE format('SELECT %I FROM user_usages WHERE user_id = $1', p_field)
        INTO v_current USING p_user_id;
        RETURN json_build_object('allowed', false, 'current', v_current);
    END IF;

    RETURN json_build_object('allowed', true, 'current', v_current);
END;
$$;

-- Decrement a counter (floor at 0)
CREATE OR REPLACE FUNCTION decrement_usage(
    p_user_id UUID,
    p_field TEXT
) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF p_field = 'project_count' THEN
        UPDATE user_usages SET project_count = GREATEST(project_count - 1, 0), updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSIF p_field = 'doc_count' THEN
        UPDATE user_usages SET doc_count = GREATEST(doc_count - 1, 0), updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSIF p_field = 'note_count' THEN
        UPDATE user_usages SET note_count = GREATEST(note_count - 1, 0), updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
END;
$$;

-- Batch decrement (for cascade deletes, e.g. delete project with N docs)
CREATE OR REPLACE FUNCTION decrement_usage_by(
    p_user_id UUID,
    p_field TEXT,
    p_amount INT
) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF p_field = 'doc_count' THEN
        UPDATE user_usages SET doc_count = GREATEST(doc_count - p_amount, 0), updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSIF p_field = 'project_count' THEN
        UPDATE user_usages SET project_count = GREATEST(project_count - p_amount, 0), updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSIF p_field = 'note_count' THEN
        UPDATE user_usages SET note_count = GREATEST(note_count - p_amount, 0), updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
END;
$$;

-- Token: check only (before LLM call)
CREATE OR REPLACE FUNCTION check_token_limit(
    p_user_id UUID,
    p_limit BIGINT
) RETURNS JSON
LANGUAGE plpgsql AS $$
DECLARE
    v_current BIGINT;
BEGIN
    INSERT INTO user_usages (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT token_used INTO v_current FROM user_usages WHERE user_id = p_user_id;

    RETURN json_build_object(
        'allowed', v_current < p_limit,
        'current', v_current
    );
END;
$$;

-- Token: increment by actual amount (after LLM call)
CREATE OR REPLACE FUNCTION increment_token_usage(
    p_user_id UUID,
    p_amount BIGINT
) RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    v_new BIGINT;
BEGIN
    UPDATE user_usages SET token_used = token_used + p_amount, updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING token_used INTO v_new;
    RETURN v_new;
END;
$$;

-- Get usage (for profile endpoint)
CREATE OR REPLACE FUNCTION get_user_usage(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql AS $$
DECLARE
    v_result JSON;
BEGIN
    INSERT INTO user_usages (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT json_build_object(
        'project_count', project_count,
        'doc_count', doc_count,
        'note_count', note_count,
        'token_used', token_used
    ) INTO v_result
    FROM user_usages WHERE user_id = p_user_id;

    RETURN v_result;
END;
$$;
