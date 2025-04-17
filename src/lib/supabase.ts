import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Create a Supabase client with the API credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to directly update a recording
async function directUpdateRecording(id: string, data: Partial<Recording>) {
  console.log(`Directly updating recording ${id}:`, data);
  
  const result = await supabase
    .from('recordings')
    .update(data)
    .eq('id', id)
    .select();
    
  if (result.error) {
    console.error(`Failed to update recording ${id}:`, result.error);
  } else {
    console.log(`Successfully updated recording ${id}`);
  }
  
  return result;
}

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

// Define types for tags
export type Tag = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
};

export type RecordingTag = {
  recording_id: string;
  tag_id: string;
};

// Utility function to add delay between operations
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Inserts a new recording into the database
 */
export async function createRecording(
  data: Omit<Recording, 'id' | 'created_at' | 'updated_at'>, 
  client?: any
) {
  console.log(`[createRecording] Using ${client ? 'provided client' : 'default supabase client'}`);
  
  const activeClient = client || supabase;
  
  return await activeClient
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
export async function updateRecording(id: string, data: Partial<Recording>, client?: any) {
  console.log(`[updateRecording] Attempting to update recording ${id} with:`, data);
  console.log(`[updateRecording] Using ${client ? 'provided auth client' : 'default supabase client'}`);
  
  const activeClient = client || supabase;
  
  // First verify the recording exists
  const { data: existingRecording, error: checkError } = await activeClient
    .from('recordings')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();
  
  if (checkError) {
    console.error(`[updateRecording] Error checking recording existence:`, checkError);
    return { error: checkError };
  }
  
  if (!existingRecording) {
    console.log(`[updateRecording] Recording ${id} not found or not accessible`);
    return { 
      data: null,
      error: { 
        message: `Recording ${id} not found or not accessible`, 
        details: 'RLS may be preventing access' 
      } 
    };
  }
  
  console.log(`[updateRecording] Found existing recording:`, existingRecording);
  
  // If recording exists and is accessible, proceed with update
  const result = await activeClient
    .from('recordings')
    .update(data)
    .eq('id', id)
    .select()
    .single();
      
  if (result.error) {
    console.error(`[updateRecording] Update failed:`, result.error);
  } else {
    console.log(`[updateRecording] Update successful:`, result.data);
  }
    
  return result;
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
  totalDuration?: number,
  authClient?: any // Add optional auth client parameter
) {
  // Calculate the total duration if not provided
  const calculatedDuration = totalDuration || 
    (segments.length > 0 ? Math.max(...segments.map(s => s.endTime)) : null);
  
  console.log(`Creating transcription for recording ${recordingId} with ${segments.length} segments`);
  
  try {
    // Use the provided auth client or fall back to regular client
    const client = authClient || supabase;
    
    // Add delay before creating transcription
    await delay(2000); // 2 second delay
    
    // First create the transcription record
    const { data: transcriptionData, error: transcriptionError } = await client
      .from('transcriptions')
      .insert({
        recording_id: recordingId,
        total_duration_seconds: calculatedDuration,
        transcript_format: 'json'
      })
      .select()
      .single();
    
    if (transcriptionError) {
      console.error('Error creating transcription:', transcriptionError);
      throw transcriptionError;
    }
    
    console.log(`Transcription created with ID: ${transcriptionData.id}`);
    
    // Add delay before creating segments
    await delay(2000); // 2 second delay
    
    // Then create all the transcript segments
    if (segments.length > 0) {
      await insertSegmentsAndUpdateRecording(
        transcriptionData,
        segments,
        recordingId,
        calculatedDuration,
        false, // use regular client
        client // Pass the same client
      );
    }
    
    return transcriptionData;
  } catch (error) {
    console.error('Error in createTranscription:', error);
    throw error;
  }
}

/**
 * Helper function to insert segments and update recording status
 */
async function insertSegmentsAndUpdateRecording(
  transcriptionData: any,
  segments: TranscriptSegmentData[],
  recordingId: string,
  calculatedDuration: number | null,
  useAdmin: boolean = false,
  authClient?: any // Add optional auth client parameter
) {
  const client = authClient || supabase;
  
  try {
    const segmentsToInsert = segments.map((segment, index) => ({
      transcription_id: transcriptionData.id,
      segment_index: index,
      text: segment.text,
      start_time: segment.startTime,
      end_time: segment.endTime,
      speaker: segment.speaker || null,
      confidence: segment.confidence || null
    }));
    
    console.log(`Inserting ${segmentsToInsert.length} transcript segments`);
    
    // Add delay before inserting segments
    await delay(2000); // 2 second delay
    
    // Try inserting segments with retries
    let segmentsError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await client
        .from('transcript_segments')
        .insert(segmentsToInsert);
        
      if (!error) {
        break;
      }
      
      segmentsError = error;
      if (attempt < 3) {
        console.log(`Attempt ${attempt} failed, retrying after delay...`);
        await delay(3000 * attempt); // Exponential backoff
      }
    }
    
    if (segmentsError) {
      console.error(`Error creating transcript segments after retries:`, segmentsError);
      throw segmentsError;
    }
    
    console.log(`Successfully inserted ${segmentsToInsert.length} transcript segments`);
    
    // Add delay before updating recording
    await delay(2000); // 2 second delay
    
    // Update the recording with the duration and completed status
    console.log(`Updating recording ${recordingId} status to 'completed' with duration ${calculatedDuration}`);
    
    // Use regular updateRecording which now has fallback to admin client
    const result = await updateRecordingWithRetry(
      recordingId, 
      {
        duration_seconds: calculatedDuration,
        transcription_status: 'completed'
      },
      10000, // retryDelayMs
      3,     // maxRetries
      client // Pass the client as an additional parameter
    );
    
    if (result.error) {
      console.error(`Failed to update recording status to 'completed':`, result.error);
      throw result.error;
    } else {
      console.log(`Successfully updated recording status to 'completed'`);
    }
  } catch (error) {
    console.error('Error in insertSegmentsAndUpdateRecording:', error);
    throw error;
  }
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
export async function getAllRecordings(userId?: string) {
  console.log('getAllRecordings called with userId:', userId);
  
  const query = supabase
    .from('recordings')
    .select('*');
    
  // If a userId is provided, filter by user_id
  if (userId) {
    console.log('Filtering recordings by user_id:', userId);
    query.eq('user_id', userId);
  } else {
    console.log('No userId provided, fetching all recordings (RLS will restrict to user only)');
  }
  
  console.log('Executing query:', query);
  const result = await query.order('created_at', { ascending: false });
  console.log('Query result:', {
    success: !result.error,
    count: result.data?.length || 0,
    error: result.error
  });
  
  if (result.error) {
    console.error('Error fetching recordings:', result.error);
  } else if (!result.data || result.data.length === 0) {
    console.log('No recordings found for user:', userId);
  }
  
  return result;
}

/**
 * Utility function to fix recordings that are stuck in pending status despite having transcriptions
 */
export async function fixPendingRecordingsWithTranscriptions() {
  console.log('Looking for recordings with pending status that have transcriptions...');
  
  // First, find all recordings with pending status that have transcriptions
  const { data: pendingRecordings, error: findError } = await supabase
    .from('recordings')
    .select('id, file_name, transcription_status')
    .eq('transcription_status', 'pending');
  
  if (findError) {
    console.error('Error finding pending recordings:', findError);
    return { success: false, error: findError };
  }
  
  // Get all transcriptions to check which recordings have them
  const { data: transcriptions, error: transError } = await supabase
    .from('transcriptions')
    .select('recording_id');
  
  if (transError) {
    console.error('Error fetching transcriptions:', transError);
    return { success: false, error: transError };
  }
  
  // Filter to only keep recordings that have transcriptions
  const transcriptionRecordingIds = transcriptions.map(t => t.recording_id);
  const pendingWithTranscriptions = pendingRecordings.filter(
    rec => transcriptionRecordingIds.includes(rec.id)
  );
  
  console.log(`Found ${pendingWithTranscriptions.length} recordings with pending status that have transcriptions`);
  
  if (pendingWithTranscriptions.length === 0) {
    return { success: true, fixedCount: 0 };
  }
  
  // Update each recording status to completed
  const recordingIds = pendingWithTranscriptions.map(rec => rec.id);
  console.log('Updating recordings to completed status:', recordingIds);
  
  const { data: updatedRecordings, error: updateError } = await supabase
    .from('recordings')
    .update({ transcription_status: 'completed' })
    .in('id', recordingIds)
    .select('id, file_name');
  
  if (updateError) {
    console.error('Error updating recordings to completed status:', updateError);
    return { success: false, error: updateError };
  }
  
  console.log(`Successfully updated ${updatedRecordings?.length || 0} recordings to completed status`);
  
  // Now update the duration for each recording based on their transcription data
  for (const recordingId of recordingIds) {
    try {
      const { data: transcription } = await supabase
        .from('transcriptions')
        .select('total_duration_seconds')
        .eq('recording_id', recordingId)
        .single();
      
      if (transcription?.total_duration_seconds) {
        await supabase
          .from('recordings')
          .update({ duration_seconds: transcription.total_duration_seconds })
          .eq('id', recordingId);
        
        console.log(`Updated duration for recording ${recordingId} to ${transcription.total_duration_seconds}`);
      }
    } catch (error) {
      console.error(`Error updating duration for recording ${recordingId}:`, error);
      // Continue to next recording
    }
  }
  
  return { 
    success: true, 
    fixedCount: updatedRecordings?.length || 0,
    recordings: updatedRecordings 
  };
}

/**
 * Updates a recording with retry capability
 */
export async function updateRecordingWithRetry(
  id: string, 
  data: Partial<Recording>, 
  retryDelayMs: number = 10000, 
  maxRetries: number = 2,
  client?: any
): Promise<any> {
  console.log(`[updateRecordingWithRetry] Attempting to update recording ${id} with retry capability`);
  
  // First attempt
  let result = await updateRecording(id, data, client);
  let attempts = 1;
  
  // Check if the error is "recording not found" or RLS related
  while (
    result.error && 
    attempts < maxRetries &&
    (result.error.message?.includes('not found') || 
     result.error.message?.includes('not accessible'))
  ) {
    console.log(`[updateRecordingWithRetry] Recording ${id} update failed on attempt ${attempts}. Waiting ${retryDelayMs}ms before retry...`);
    
    // Wait for the specified delay
    await delay(retryDelayMs);
    
    console.log(`[updateRecordingWithRetry] Retrying update for recording ${id}, attempt ${attempts + 1} of ${maxRetries}`);
    result = await updateRecording(id, data, client);
    attempts++;
  }
  
  if (result.error) {
    console.error(`[updateRecordingWithRetry] Failed to update recording ${id} after ${attempts} attempt(s):`, result.error);
  } else {
    console.log(`[updateRecordingWithRetry] Successfully updated recording ${id} on attempt ${attempts}`);
  }
  
  return result;
}

/**
 * Creates a new tag for a user
 */
export async function createTag(name: string, userId: string, client?: any) {
  const activeClient = client || supabase;
  
  return await activeClient
    .from('tags')
    .insert({
      name,
      user_id: userId
    })
    .select()
    .single();
}

/**
 * Gets all tags for a user
 */
export async function getUserTags(userId: string, client?: any) {
  const activeClient = client || supabase;
  
  return await activeClient
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
}

/**
 * Add tags to a recording
 * @param recordingId - The ID of the recording
 * @param tagIds - Array of tag IDs to associate with the recording
 */
export async function addTagsToRecording(recordingId: string, tagIds: string[], client?: any) {
  const activeClient = client || supabase;
  
  // Create an array of objects for insertion
  const recordingTags = tagIds.map(tagId => ({
    recording_id: recordingId,
    tag_id: tagId
  }));
  
  return await activeClient
    .from('recording_tags')
    .insert(recordingTags);
}

/**
 * Remove a tag from a recording
 */
export async function removeTagFromRecording(recordingId: string, tagId: string, client?: any) {
  const activeClient = client || supabase;
  
  return await activeClient
    .from('recording_tags')
    .delete()
    .eq('recording_id', recordingId)
    .eq('tag_id', tagId);
}

/**
 * Get all tags for a specific recording
 */
export async function getRecordingTags(recordingId: string, client?: any) {
  const activeClient = client || supabase;
  
  // First, get the tag IDs associated with this recording
  const { data: tagAssociations, error: tagError } = await activeClient
    .from('recording_tags')
    .select('tag_id')
    .eq('recording_id', recordingId);
    
  if (tagError || !tagAssociations || tagAssociations.length === 0) {
    return { data: [], error: tagError };
  }
  
  // Get all tag details from the tags table
  const tagIds = tagAssociations.map((assoc: { tag_id: string }) => assoc.tag_id);
  
  return await activeClient
    .from('tags')
    .select(`
      id,
      name,
      created_at
    `)
    .in('id', tagIds)
    .order('name', { ascending: true });
}

/**
 * Find recordings by tag IDs (all tags must match)
 */
export async function findRecordingsByTags(tagIds: string[], userId: string, client?: any) {
  const activeClient = client || supabase;
  
  try {
    // First, get all recording_tags entries for the specified tags
    const { data: tagAssociations, error: tagError } = await activeClient
      .from('recording_tags')
      .select('recording_id, tag_id')
      .in('tag_id', tagIds);
      
    if (tagError) {
      console.error('Error fetching tag associations:', tagError);
      return { data: [], error: tagError };
    }
    
    if (!tagAssociations || tagAssociations.length === 0) {
      console.log('No recordings associated with the specified tags');
      return { data: [], error: null };
    }
    
    // Group by recording_id and count occurrences
    const recordingCounts: Record<string, number> = {};
    tagAssociations.forEach((assoc: { recording_id: string }) => {
      recordingCounts[assoc.recording_id] = (recordingCounts[assoc.recording_id] || 0) + 1;
    });
    
    // Only keep recordings that have ALL the requested tags
    const matchingRecordingIds = Object.entries(recordingCounts)
      .filter(([_, count]: [string, number]) => count >= tagIds.length)
      .map(([recordingId, _]: [string, number]) => recordingId);
    
    if (matchingRecordingIds.length === 0) {
      console.log('No recordings have all the specified tags');
      return { data: [], error: null };
    }
    
    // Now fetch the full recording data for these IDs
    return await activeClient
      .from('recordings')
      .select('*')
      .eq('user_id', userId)
      .in('id', matchingRecordingIds)
      .order('created_at', { ascending: false });
      
  } catch (error) {
    console.error('Error in findRecordingsByTags:', error);
    return { data: [], error };
  }
} 