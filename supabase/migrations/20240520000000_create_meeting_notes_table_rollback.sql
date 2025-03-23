-- Rollback for: 20240520000000_create_meeting_notes_table.sql

-- Drop the trigger
DROP TRIGGER IF EXISTS update_meeting_notes_updated_at ON meeting_notes;

-- Drop policy
DROP POLICY IF EXISTS "Allow public access to meeting notes" ON meeting_notes;

-- Drop table
DROP TABLE IF EXISTS meeting_notes; 