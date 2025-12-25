-- Add collection_pin column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS collection_pin VARCHAR(6);

-- Create index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_orders_collection_pin ON orders(collection_pin);

