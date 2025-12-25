-- Add rejection_reason column to restaurants table
-- Run this in your Supabase SQL Editor

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update the status check constraint to include REJECTED
ALTER TABLE restaurants 
DROP CONSTRAINT IF EXISTS restaurants_status_check;

ALTER TABLE restaurants 
ADD CONSTRAINT restaurants_status_check 
CHECK (status IN ('ACTIVE', 'PAUSED', 'PENDING', 'REJECTED'));

