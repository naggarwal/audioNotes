-- Create meeting_notes table for storing AI-generated meeting notes
-- Migration: 20240520000000_create_meeting_notes_table.sql

-- Up Migration
CREATE TABLE IF NOT EXISTS meeting_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    summary TEXT,
    key_points JSONB,
    action_items JSONB,
    decisions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index
CREATE INDEX IF NOT EXISTS meeting_notes_recording_id_idx ON meeting_notes(recording_id);

-- Enable Row Level Security
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public access
-- Since we're not requiring login for now, allow full access
CREATE POLICY "Allow public access to meeting notes" 
    ON meeting_notes 
    USING (true);

-- Create trigger to update the updated_at timestamp
CREATE TRIGGER update_meeting_notes_updated_at
BEFORE UPDATE ON meeting_notes
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Down Migration (Rollback)
-- Note: Comment out the entire block below when running the migration
-- Uncomment and run to rollback the migration
/*
DROP TRIGGER IF EXISTS update_meeting_notes_updated_at ON meeting_notes;
DROP POLICY IF EXISTS "Allow public access to meeting notes" ON meeting_notes;
DROP TABLE IF EXISTS meeting_notes;
*/ 