-- Add PIN lockout columns to zytek_users
ALTER TABLE zytek_users ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0;
ALTER TABLE zytek_users ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ;
