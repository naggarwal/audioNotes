-- Update security policies for recordings table
-- Migration: 20240601000001_update_recordings_security.sql

-- Up Migration

-- Drop the existing public access policy
DROP POLICY IF EXISTS "Allow public access to recordings" ON recordings;

-- Create a policy to allow users to view only their own recordings
CREATE POLICY "Users can view own recordings" 
    ON recordings 
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create a policy to allow users to update only their own recordings
CREATE POLICY "Users can update own recordings" 
    ON recordings 
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create a policy to allow users to delete only their own recordings
CREATE POLICY "Users can delete own recordings" 
    ON recordings 
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create a policy to allow users to insert recordings and associate them with their user ID
CREATE POLICY "Users can insert own recordings" 
    ON recordings 
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Down Migration (Rollback)
-- Note: Comment out the entire block below when running the migration
-- Uncomment and run to rollback the migration
/*
DROP POLICY IF EXISTS "Users can view own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can update own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON recordings;

-- Restore the original public access policy
CREATE POLICY "Allow public access to recordings" 
    ON recordings 
    USING (true);
*/ 