-- Migration to add profile fields to users table
-- Run this in your Supabase SQL Editor

-- Add default_role column (stores the user's default selected role for navigation)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS default_role VARCHAR(20) CHECK (default_role IN ('USER', 'RESTAURANT', 'ADMIN'));

-- Add name column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add default_addresses column (JSONB array of addresses)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS default_addresses JSONB DEFAULT '[]'::jsonb;

-- Create index on default_role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_default_role ON users(default_role);

