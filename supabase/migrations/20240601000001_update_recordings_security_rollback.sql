-- Rollback security policies update for recordings table
-- Migration: 20240601000001_update_recordings_security_rollback.sql

DROP POLICY IF EXISTS "Users can view own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can update own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON recordings;

-- Restore the original public access policy
CREATE POLICY "Allow public access to recordings" 
    ON recordings 
    USING (true); 