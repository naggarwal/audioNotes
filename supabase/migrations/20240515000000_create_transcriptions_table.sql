-- Create transcriptions table for storing processed transcripts
-- Migration: 20240515000000_create_transcriptions_table.sql

-- Up Migration
CREATE TABLE IF NOT EXISTS transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    total_duration_seconds NUMERIC(10, 2),
    transcript_format TEXT NOT NULL DEFAULT 'json', -- To account for potential future formats
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create a table to store individual transcript segments
CREATE TABLE IF NOT EXISTS transcript_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
    segment_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    start_time NUMERIC(10, 2) NOT NULL,
    end_time NUMERIC(10, 2) NOT NULL,
    speaker TEXT,
    confidence NUMERIC(5, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS transcriptions_recording_id_idx ON transcriptions(recording_id);
CREATE INDEX IF NOT EXISTS transcript_segments_transcription_id_idx ON transcript_segments(transcription_id);
CREATE INDEX IF NOT EXISTS transcript_segments_index_idx ON transcript_segments(segment_index);

-- Enable Row Level Security
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access
-- Since we're not requiring login for now, allow full access
CREATE POLICY "Allow public access to transcriptions" 
    ON transcriptions 
    USING (true);

CREATE POLICY "Allow public access to transcript segments" 
    ON transcript_segments 
    USING (true);

-- Create trigger to update the updated_at timestamp for transcriptions
CREATE TRIGGER update_transcriptions_updated_at
BEFORE UPDATE ON transcriptions
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Down Migration (Rollback)
-- Note: Comment out the entire block below when running the migration
-- Uncomment and run to rollback the migration
/*
DROP TRIGGER IF EXISTS update_transcriptions_updated_at ON transcriptions;
DROP POLICY IF EXISTS "Allow public access to transcript segments" ON transcript_segments;
DROP POLICY IF EXISTS "Allow public access to transcriptions" ON transcriptions;
DROP TABLE IF EXISTS transcript_segments;
DROP TABLE IF EXISTS transcriptions;
*/ 