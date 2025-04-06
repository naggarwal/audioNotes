-- Migration to update RLS policies to be strictly user-based
-- Migration: 20240516000000_update_rls_policies.sql

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow transcription creation (unrestricted)" ON transcriptions;
DROP POLICY IF EXISTS "Allow transcript segments creation (unrestricted)" ON transcript_segments;
DROP POLICY IF EXISTS "Users can view own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can update own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can view own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Users can update own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Users can view own transcript segments" ON transcript_segments;
DROP POLICY IF EXISTS "Users can update own transcript segments" ON transcript_segments;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public access to recordings" ON recordings;
DROP POLICY IF EXISTS "Enable insert for users own recordings" ON recordings;
DROP POLICY IF EXISTS "Enable read for users own recordings" ON recordings;
DROP POLICY IF EXISTS "Enable update for users own recordings" ON recordings;
DROP POLICY IF EXISTS "Enable delete for users own recordings" ON recordings;

DROP POLICY IF EXISTS "Allow public access to transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Enable insert for users own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Enable read for users own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Enable update for users own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Enable delete for users own transcriptions" ON transcriptions;

-- Create new restrictive policies for recordings
CREATE POLICY "Enable insert for authenticated users only" 
    ON recordings FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable read access for record owners only" 
    ON recordings FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Enable update for record owners only" 
    ON recordings FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for record owners only" 
    ON recordings FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Create new restrictive policies for transcriptions
CREATE POLICY "Enable insert for recording owners only" 
    ON transcriptions FOR INSERT 
    TO authenticated 
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id 
            FROM recordings 
            WHERE id = recording_id
        )
    );

CREATE POLICY "Enable read access for recording owners only" 
    ON transcriptions FOR SELECT 
    TO authenticated 
    USING (
        auth.uid() IN (
            SELECT user_id 
            FROM recordings 
            WHERE id = recording_id
        )
    );

CREATE POLICY "Enable update for recording owners only" 
    ON transcriptions FOR UPDATE 
    TO authenticated 
    USING (
        auth.uid() IN (
            SELECT user_id 
            FROM recordings 
            WHERE id = recording_id
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id 
            FROM recordings 
            WHERE id = recording_id
        )
    );

CREATE POLICY "Enable delete for recording owners only" 
    ON transcriptions FOR DELETE 
    TO authenticated 
    USING (
        auth.uid() IN (
            SELECT user_id 
            FROM recordings 
            WHERE id = recording_id
        )
    );

-- Create similar policies for transcript_segments
DROP POLICY IF EXISTS "Allow public access to transcript_segments" ON transcript_segments;
DROP POLICY IF EXISTS "Enable insert for users own transcript_segments" ON transcript_segments;
DROP POLICY IF EXISTS "Enable read for users own transcript_segments" ON transcript_segments;
DROP POLICY IF EXISTS "Enable update for users own transcript_segments" ON transcript_segments;
DROP POLICY IF EXISTS "Enable delete for users own transcript_segments" ON transcript_segments;

CREATE POLICY "Enable insert for transcription owners only" 
    ON transcript_segments FOR INSERT 
    TO authenticated 
    WITH CHECK (
        auth.uid() IN (
            SELECT r.user_id 
            FROM recordings r
            JOIN transcriptions t ON t.recording_id = r.id
            WHERE t.id = transcription_id
        )
    );

CREATE POLICY "Enable read access for transcription owners only" 
    ON transcript_segments FOR SELECT 
    TO authenticated 
    USING (
        auth.uid() IN (
            SELECT r.user_id 
            FROM recordings r
            JOIN transcriptions t ON t.recording_id = r.id
            WHERE t.id = transcription_id
        )
    );

CREATE POLICY "Enable update for transcription owners only" 
    ON transcript_segments FOR UPDATE 
    TO authenticated 
    USING (
        auth.uid() IN (
            SELECT r.user_id 
            FROM recordings r
            JOIN transcriptions t ON t.recording_id = r.id
            WHERE t.id = transcription_id
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT r.user_id 
            FROM recordings r
            JOIN transcriptions t ON t.recording_id = r.id
            WHERE t.id = transcription_id
        )
    );

CREATE POLICY "Enable delete for transcription owners only" 
    ON transcript_segments FOR DELETE 
    TO authenticated 
    USING (
        auth.uid() IN (
            SELECT r.user_id 
            FROM recordings r
            JOIN transcriptions t ON t.recording_id = r.id
            WHERE t.id = transcription_id
        )
    );

CREATE POLICY "Enable read access for authenticated users" ON "meeting_notes"
FOR SELECT TO authenticated_users
USING (
  EXISTS (
    SELECT 1 FROM recordings
    WHERE recordings.id = meeting_notes.recording_id
    AND recordings.user_id = auth.uid()
  )
);

CREATE POLICY "Enable insert access for authenticated users" ON "meeting_notes"
FOR INSERT TO authenticated_users
WITH CHECK (
  EXISTS (
    SELECT 1 FROM recordings
    WHERE recordings.id = meeting_notes.recording_id
    AND recordings.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update access for authenticated users" ON "meeting_notes"
FOR UPDATE TO authenticated_users
USING (
  EXISTS (
    SELECT 1 FROM recordings
    WHERE recordings.id = meeting_notes.recording_id
    AND recordings.user_id = auth.uid()
  )
); 