-- Add rejection_reason column to restaurant_change_requests table
ALTER TABLE restaurant_change_requests
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_change_requests_rejection_reason ON restaurant_change_requests(restaurant_id) WHERE rejection_reason IS NOT NULL;

