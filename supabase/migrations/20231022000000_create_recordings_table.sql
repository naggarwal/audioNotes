-- Create recordings table for storing uploaded audio files
-- Migration: 20231022000000_create_recordings_table.sql

-- Up Migration
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    duration_seconds NUMERIC(10, 2),
    file_format TEXT,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create an index on created_at for sorting and filtering
CREATE INDEX IF NOT EXISTS recordings_created_at_idx ON recordings(created_at);

-- Enable Row Level Security
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public access
-- Since we're not requiring login for now, allow full access
CREATE POLICY "Allow public access to recordings" 
    ON recordings 
    USING (true);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recordings_updated_at
BEFORE UPDATE ON recordings
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Down Migration (Rollback)
-- Note: Comment out the entire block below when running the migration
-- Uncomment and run to rollback the migration
/*
DROP TRIGGER IF EXISTS update_recordings_updated_at ON recordings;
DROP FUNCTION IF EXISTS update_modified_column();
DROP POLICY IF EXISTS "Allow public access to recordings" ON recordings;
DROP TABLE IF EXISTS recordings;
*/ 