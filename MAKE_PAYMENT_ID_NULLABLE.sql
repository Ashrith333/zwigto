-- Make payment_id nullable in orders table to support cash on pickup
ALTER TABLE orders
ALTER COLUMN payment_id DROP NOT NULL;

