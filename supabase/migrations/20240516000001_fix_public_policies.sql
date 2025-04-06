-- Drop public policies
DROP POLICY IF EXISTS "Users can view own meeting notes" ON meeting_notes;
DROP POLICY IF EXISTS "Users can create meeting notes" ON meeting_notes;
DROP POLICY IF EXISTS "Users can update own meeting notes" ON meeting_notes;

DROP POLICY IF EXISTS "Enable read for users own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Enable update for users own transcriptions" ON transcriptions;

DROP POLICY IF EXISTS "Enable read for users own transcript segments" ON transcript_segments;
DROP POLICY IF EXISTS "Enable update for users own transcript segments" ON transcript_segments;

-- Create authenticated-only policies for meeting_notes
CREATE POLICY "Enable read access for authenticated users" ON meeting_notes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM recordings
    WHERE recordings.id = meeting_notes.recording_id
    AND recordings.user_id = auth.uid()
  )
);

CREATE POLICY "Enable insert access for authenticated users" ON meeting_notes
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM recordings
    WHERE recordings.id = meeting_notes.recording_id
    AND recordings.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update access for authenticated users" ON meeting_notes
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM recordings
    WHERE recordings.id = meeting_notes.recording_id
    AND recordings.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete access for authenticated users" ON meeting_notes
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM recordings
    WHERE recordings.id = meeting_notes.recording_id
    AND recordings.user_id = auth.uid()
  )
);

-- Create authenticated-only policies for transcriptions
CREATE POLICY "Enable read access for authenticated users" ON transcriptions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM recordings
    WHERE recordings.id = transcriptions.recording_id
    AND recordings.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update access for authenticated users" ON transcriptions
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM recordings
    WHERE recordings.id = transcriptions.recording_id
    AND recordings.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete access for authenticated users" ON transcriptions
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM recordings
    WHERE recordings.id = transcriptions.recording_id
    AND recordings.user_id = auth.uid()
  )
);

-- Create authenticated-only policies for transcript_segments
CREATE POLICY "Enable read access for authenticated users" ON transcript_segments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM transcriptions
    JOIN recordings ON recordings.id = transcriptions.recording_id
    WHERE transcriptions.id = transcript_segments.transcription_id
    AND recordings.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update access for authenticated users" ON transcript_segments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM transcriptions
    JOIN recordings ON recordings.id = transcriptions.recording_id
    WHERE transcriptions.id = transcript_segments.transcription_id
    AND recordings.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete access for authenticated users" ON transcript_segments
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM transcriptions
    JOIN recordings ON recordings.id = transcriptions.recording_id
    WHERE transcriptions.id = transcript_segments.transcription_id
    AND recordings.user_id = auth.uid()
  )
); 