-- Add Stripe subscription fields to profiles table
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS subscription_status     TEXT DEFAULT 'inactive',
    ADD COLUMN IF NOT EXISTS plan_interval           TEXT,           -- 'month' | 'year'
    ADD COLUMN IF NOT EXISTS current_period_end      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancel_at_period_end    BOOLEAN DEFAULT FALSE;

