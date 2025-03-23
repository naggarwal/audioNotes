-- Rollback for: 20231022000000_create_recordings_table.sql

-- Drop the trigger
DROP TRIGGER IF EXISTS update_recordings_updated_at ON recordings;

-- Drop the function
DROP FUNCTION IF EXISTS update_modified_column();

-- Drop policy
DROP POLICY IF EXISTS "Allow public access to recordings" ON recordings;

-- Drop table
DROP TABLE IF EXISTS recordings; 