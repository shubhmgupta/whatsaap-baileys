-- Add features column to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS features TEXT;
