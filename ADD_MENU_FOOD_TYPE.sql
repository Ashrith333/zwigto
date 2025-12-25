-- Add food_type column to menu_items table
-- Run this in your Supabase SQL Editor

ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS food_type VARCHAR(10) CHECK (food_type IN ('VEG', 'NON_VEG'));

