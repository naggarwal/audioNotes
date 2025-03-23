-- Migration to update existing recordings with transcription data
-- Migration: 20240515000001_update_existing_recordings.sql

-- This migration will:
-- 1. Find all existing recordings with completed transcription_status
-- 2. Create corresponding entries in the transcriptions table
-- 3. Create corresponding entries in the transcript_segments table (if possible)

-- Temporary function to process existing recordings
CREATE OR REPLACE FUNCTION migrate_existing_transcriptions()
RETURNS void AS $$
DECLARE
    rec RECORD;
    metadata_json JSONB;
    new_transcription_id UUID;
    segment RECORD;
    segment_index INTEGER;
BEGIN
    -- Find all recordings with completed transcriptions
    FOR rec IN 
        SELECT 
            id, 
            duration_seconds, 
            metadata
        FROM 
            recordings
        WHERE 
            transcription_status = 'completed'
    LOOP
        -- Create a transcription record for this recording
        INSERT INTO transcriptions (
            recording_id,
            total_duration_seconds,
            transcript_format
        ) VALUES (
            rec.id,
            rec.duration_seconds,
            'json'
        ) RETURNING id INTO new_transcription_id;
        
        -- Check if the metadata contains transcript segments
        IF rec.metadata ? 'transcript' THEN
            metadata_json := rec.metadata->'transcript';
            
            -- If it's an array, process each element as a segment
            IF jsonb_typeof(metadata_json) = 'array' THEN
                segment_index := 0;
                
                -- Process each segment
                FOR segment IN 
                    SELECT value FROM jsonb_array_elements(metadata_json)
                LOOP
                    -- Insert the segment
                    INSERT INTO transcript_segments (
                        transcription_id,
                        segment_index,
                        text,
                        start_time,
                        end_time,
                        speaker
                    ) VALUES (
                        new_transcription_id,
                        segment_index,
                        segment.value->>'text',
                        (segment.value->>'startTime')::numeric,
                        (segment.value->>'endTime')::numeric,
                        segment.value->>'speaker'
                    );
                    
                    segment_index := segment_index + 1;
                END LOOP;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT migrate_existing_transcriptions();

-- Clean up by dropping the temporary function
DROP FUNCTION migrate_existing_transcriptions(); 