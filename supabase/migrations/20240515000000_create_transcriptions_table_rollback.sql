-- Rollback for: 20240515000000_create_transcriptions_table.sql

-- Drop triggers
DROP TRIGGER IF EXISTS update_transcriptions_updated_at ON transcriptions;

-- Drop policies
DROP POLICY IF EXISTS "Allow public access to transcript segments" ON transcript_segments;
DROP POLICY IF EXISTS "Allow public access to transcriptions" ON transcriptions;

-- Drop tables
DROP TABLE IF EXISTS transcript_segments;
DROP TABLE IF EXISTS transcriptions; 