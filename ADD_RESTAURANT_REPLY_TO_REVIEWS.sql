-- Add restaurant_reply column to reviews table
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS restaurant_reply TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_reply ON reviews(restaurant_id) WHERE restaurant_reply IS NOT NULL;

