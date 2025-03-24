import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the API credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single supabase client for server-side use
export const supabase = createClient(supabaseUrl, supabaseKey);

// Define types for our database tables
export type Recording = {
  id: string;
  file_name: string;
  original_file_name: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  file_format: string | null;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: Record<string, any>;
};

export type Transcription = {
  id: string;
  recording_id: string;
  total_duration_seconds: number | null;
  transcript_format: string;
  created_at: string;
  updated_at: string;
};

export type TranscriptSegment = {
  id: string;
  transcription_id: string;
  segment_index: number;
  text: string;
  start_time: number;
  end_time: number;
  speaker: string | null;
  confidence: number | null;
  created_at: string;
};

// Interface for transcript segments as received from transcription services
export interface TranscriptSegmentData {
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  confidence?: number;
}

export type MeetingNotes = {
  id: string;
  recording_id: string;
  summary: string | null;
  key_points: string[] | null;
  action_items: string[] | null;
  decisions: string[] | null;
  created_at: string;
  updated_at: string;
};

/**
 * Inserts a new recording into the database
 */
export async function createRecording(data: Omit<Recording, 'id' | 'created_at' | 'updated_at'>) {
  return await supabase
    .from('recordings')
    .insert(data)
    .select()
    .single();
}

/**
 * Gets a recording by ID
 */
export async function getRecording(id: string) {
  return await supabase
    .from('recordings')
    .select('*')
    .eq('id', id)
    .single();
}

/**
 * Gets all recordings for a user
 */
export async function getUserRecordings(userId: string) {
  return await supabase
    .from('recordings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

/**
 * Updates a recording
 */
export async function updateRecording(id: string, data: Partial<Recording>) {
  return await supabase
    .from('recordings')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

/**
 * Deletes a recording
 */
export async function deleteRecording(id: string) {
  return await supabase
    .from('recordings')
    .delete()
    .eq('id', id);
}

/**
 * Creates a new transcription with its segments
 */
export async function createTranscription(
  recordingId: string, 
  segments: TranscriptSegmentData[],
  totalDuration?: number
) {
  // Calculate the total duration if not provided
  const calculatedDuration = totalDuration || 
    (segments.length > 0 ? Math.max(...segments.map(s => s.endTime)) : null);
  
  // First create the transcription record
  const { data: transcriptionData, error: transcriptionError } = await supabase
    .from('transcriptions')
    .insert({
      recording_id: recordingId,
      total_duration_seconds: calculatedDuration,
      transcript_format: 'json'
    })
    .select()
    .single();
  
  if (transcriptionError || !transcriptionData) {
    console.error('Error creating transcription:', transcriptionError);
    throw transcriptionError;
  }
  
  // Then create all the transcript segments
  if (segments.length > 0) {
    const segmentsToInsert = segments.map((segment, index) => ({
      transcription_id: transcriptionData.id,
      segment_index: index,
      text: segment.text,
      start_time: segment.startTime,
      end_time: segment.endTime,
      speaker: segment.speaker || null,
      confidence: segment.confidence || null
    }));
    
    const { error: segmentsError } = await supabase
      .from('transcript_segments')
      .insert(segmentsToInsert);
      
    if (segmentsError) {
      console.error('Error creating transcript segments:', segmentsError);
      throw segmentsError;
    }
    
    // Update the recording with the duration and completed status
    await updateRecording(recordingId, {
      duration_seconds: calculatedDuration,
      transcription_status: 'completed'
    });
  }
  
  return transcriptionData;
}

/**
 * Gets a transcription with all its segments
 */
export async function getTranscriptionWithSegments(transcriptionId: string) {
  // Get the transcription
  const { data: transcription, error: transcriptionError } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('id', transcriptionId)
    .single();
    
  if (transcriptionError) {
    console.error('Error fetching transcription:', transcriptionError);
    throw transcriptionError;
  }
  
  // Get all segments for this transcription
  const { data: segments, error: segmentsError } = await supabase
    .from('transcript_segments')
    .select('*')
    .eq('transcription_id', transcriptionId)
    .order('segment_index', { ascending: true });
    
  if (segmentsError) {
    console.error('Error fetching transcript segments:', segmentsError);
    throw segmentsError;
  }
  
  return {
    transcription,
    segments
  };
}

/**
 * Gets a transcription by recording ID
 */
export async function getTranscriptionByRecordingId(recordingId: string) {
  // Get the transcription for this recording
  const { data: transcription, error: transcriptionError } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('recording_id', recordingId)
    .single();
    
  if (transcriptionError) {
    console.error('Error fetching transcription for recording:', transcriptionError);
    return null; // Return null instead of throwing to handle case where transcription doesn't exist yet
  }
  
  // Get all segments for this transcription
  const { data: segments, error: segmentsError } = await supabase
    .from('transcript_segments')
    .select('*')
    .eq('transcription_id', transcription.id)
    .order('segment_index', { ascending: true });
    
  if (segmentsError) {
    console.error('Error fetching transcript segments:', segmentsError);
    throw segmentsError;
  }
  
  return {
    transcription,
    segments
  };
}

/**
 * Creates or updates meeting notes for a recording
 */
export async function saveMeetingNotes(
  recordingId: string, 
  notes: { 
    summary: string; 
    keyPoints: string[]; 
    actionItems: string[]; 
    decisions: string[];
  }
) {
  // Check if notes already exist for this recording
  const { data: existingNotes } = await supabase
    .from('meeting_notes')
    .select('id')
    .eq('recording_id', recordingId)
    .maybeSingle();
  
  if (existingNotes) {
    // Update existing notes
    return await supabase
      .from('meeting_notes')
      .update({
        summary: notes.summary,
        key_points: notes.keyPoints,
        action_items: notes.actionItems,
        decisions: notes.decisions,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingNotes.id)
      .select()
      .single();
  } else {
    // Insert new notes
    return await supabase
      .from('meeting_notes')
      .insert({
        recording_id: recordingId,
        summary: notes.summary,
        key_points: notes.keyPoints,
        action_items: notes.actionItems,
        decisions: notes.decisions
      })
      .select()
      .single();
  }
}

/**
 * Gets meeting notes for a recording
 */
export async function getMeetingNotes(recordingId: string) {
  return await supabase
    .from('meeting_notes')
    .select('*')
    .eq('recording_id', recordingId)
    .maybeSingle();
}

/**
 * Gets all recordings
 */
export async function getAllRecordings() {
  return await supabase
    .from('recordings')
    .select('*')
    .order('created_at', { ascending: false });
} 