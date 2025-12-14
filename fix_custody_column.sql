-- Add missing updated_at column to chain_of_custody_entries
ALTER TABLE chain_of_custody_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
