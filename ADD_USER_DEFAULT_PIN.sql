-- Add default_pin column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS default_pin VARCHAR(4);

-- Create index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_users_default_pin ON users(default_pin);

-- Generate default PINs for existing users (4-digit random)
UPDATE users
SET default_pin = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE default_pin IS NULL;

