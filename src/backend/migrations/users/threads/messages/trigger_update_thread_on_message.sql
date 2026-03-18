-- Migration: Trigger to update thread timestamps on new message
-- Description: Automatically bumps threads.updated_at and threads.last_message_at
--              whenever a new message is inserted, so ORDER BY updated_at DESC
--              reflects the most recently active thread.
-- Date: 2026-03-18

-- Function called by the trigger
CREATE OR REPLACE FUNCTION update_thread_timestamps_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE threads
    SET
        updated_at      = NOW(),
        last_message_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger fires after each INSERT on messages
DROP TRIGGER IF EXISTS trg_update_thread_on_message ON messages;
CREATE TRIGGER trg_update_thread_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_thread_timestamps_on_message();
