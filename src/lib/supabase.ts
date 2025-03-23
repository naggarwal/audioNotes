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