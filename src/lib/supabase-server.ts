import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Recording } from './supabase';
import { Database } from './database.types';

/**
 * Updates a recording with authenticated client from server context
 */
export async function updateRecordingWithAuthClient(
  id: string, 
  data: Partial<Recording>,
  retryDelayMs: number = 10000, 
  maxRetries: number = 2
) {
  console.log(`[updateRecordingWithAuthClient] Attempting to update recording ${id} with:`, data);
  
  // Create a new authenticated client
  const client = createRouteHandlerClient({ cookies });
  
  // First verify the recording exists
  const { data: existingRecording, error: checkError } = await client
    .from('recordings')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();
  
  if (checkError) {
    console.error(`[updateRecordingWithAuthClient] Error checking recording existence:`, checkError);
    return { error: checkError };
  }
  
  if (!existingRecording) {
    console.log(`[updateRecordingWithAuthClient] Recording ${id} not found or not accessible`);
    return { 
      data: null,
      error: { 
        message: `Recording ${id} not found or not accessible`, 
        details: 'RLS may be preventing access' 
      } 
    };
  }
  
  // If recording exists and is accessible, proceed with update
  let result = await client
    .from('recordings')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  let attempts = 1;
  
  // Retry logic for failed updates
  while (result.error && attempts < maxRetries) {
    console.log(`[updateRecordingWithAuthClient] Update failed on attempt ${attempts}. Waiting ${retryDelayMs}ms before retry...`);
    
    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    
    console.log(`[updateRecordingWithAuthClient] Retrying update for recording ${id}, attempt ${attempts + 1} of ${maxRetries}`);
    result = await client
      .from('recordings')
      .update(data)
      .eq('id', id)
      .select()
      .single();
      
    attempts++;
  }
  
  if (result.error) {
    console.error(`[updateRecordingWithAuthClient] Update failed after ${attempts} attempts:`, result.error);
  } else {
    console.log(`[updateRecordingWithAuthClient] Update successful:`, result.data);
  }
  
  return result;
}

/**
 * Creates or updates meeting notes for a recording using the authenticated client
 */
export async function saveMeetingNotesWithAuthClient(
  recordingId: string, 
  notes: { 
    summary: string; 
    keyPoints: string[]; 
    actionItems: string[]; 
    decisions: string[];
  }
) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

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