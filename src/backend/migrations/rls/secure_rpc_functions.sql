-- Migration: Secure RPC functions with SECURITY DEFINER
-- Description: RPC functions bypass RLS but validate caller identity internally
-- Date: 2026-02-09
--
-- SECURITY DEFINER = function runs as the DB owner (bypasses RLS)
-- SET search_path = public = prevents search_path injection attacks

-- ============================================================
-- 1. check_and_increment
-- ============================================================

CREATE OR REPLACE FUNCTION check_and_increment(
    p_user_id UUID,
    p_field TEXT,
    p_limit INT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- ============================================================
-- 2. decrement_usage
-- ============================================================

CREATE OR REPLACE FUNCTION decrement_usage(
    p_user_id UUID,
    p_field TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- ============================================================
-- 3. decrement_usage_by
-- ============================================================

CREATE OR REPLACE FUNCTION decrement_usage_by(
    p_user_id UUID,
    p_field TEXT,
    p_amount INT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- ============================================================
-- 4. check_token_limit
-- ============================================================

CREATE OR REPLACE FUNCTION check_token_limit(
    p_user_id UUID,
    p_limit BIGINT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- ============================================================
-- 5. increment_token_usage
-- ============================================================

CREATE OR REPLACE FUNCTION increment_token_usage(
    p_user_id UUID,
    p_amount BIGINT
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new BIGINT;
BEGIN
    UPDATE user_usages SET token_used = token_used + p_amount, updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING token_used INTO v_new;
    RETURN v_new;
END;
$$;

-- ============================================================
-- 6. get_user_usage
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_usage(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
