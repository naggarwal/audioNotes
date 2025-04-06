-- Drop all new policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON recordings;
DROP POLICY IF EXISTS "Enable read access for record owners only" ON recordings;
DROP POLICY IF EXISTS "Enable update for record owners only" ON recordings;
DROP POLICY IF EXISTS "Enable delete for record owners only" ON recordings;

DROP POLICY IF EXISTS "Enable insert for recording owners only" ON transcriptions;
DROP POLICY IF EXISTS "Enable read access for recording owners only" ON transcriptions;
DROP POLICY IF EXISTS "Enable update for recording owners only" ON transcriptions;
DROP POLICY IF EXISTS "Enable delete for recording owners only" ON transcriptions;

DROP POLICY IF EXISTS "Enable insert for transcription owners only" ON transcript_segments;
DROP POLICY IF EXISTS "Enable read access for transcription owners only" ON transcript_segments;
DROP POLICY IF EXISTS "Enable update for transcription owners only" ON transcript_segments;
DROP POLICY IF EXISTS "Enable delete for transcription owners only" ON transcript_segments;

-- Restore original policies if needed
CREATE POLICY "Enable read for users own recordings" 
    ON recordings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users own recordings" 
    ON recordings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users own recordings" 
    ON recordings FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users own recordings" 
    ON recordings FOR DELETE 
    USING (auth.uid() = user_id); 