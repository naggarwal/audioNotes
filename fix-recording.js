// Script to fix a recording's status and duration
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const RECORDING_ID = process.argv[2] || '49f24a0f-3102-4a0e-9916-d79832ee0ce7'; // Default to the problematic recording
const DURATION = 1825.82; // Set the correct duration

// Create client with anon key - will be subject to RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in your .env.local file');
  console.log('\nTo fix this:');
  console.log('1. Make sure you have the proper environment variables set up');
  console.log('2. This script will respect RLS policies, so ensure you are authenticated');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// First authenticate the user
async function fixRecording() {
  console.log('You need to be logged in to fix recordings through RLS');
  console.log('Please first use the app to login, and make sure you are the owner of the recording');
  console.log('The anon key client will respect RLS policies and only allow you to modify your own recordings');
  
  console.log(`Attempting to fix recording ${RECORDING_ID}...`);
  
  // First check if the recording exists and its current status
  const { data: recording, error: checkError } = await supabase
    .from('recordings')
    .select('*')
    .eq('id', RECORDING_ID)
    .single();
  
  if (checkError) {
    console.error('Error checking recording:', checkError);
    console.error('This may be due to RLS - ensure you are the owner of this recording');
    return;
  }
  
  console.log('Current recording status:', {
    id: recording.id,
    status: recording.transcription_status,
    duration: recording.duration_seconds,
    user_id: recording.user_id
  });
  
  // Update the recording
  const { data, error } = await supabase
    .from('recordings')
    .update({
      transcription_status: 'completed',
      duration_seconds: DURATION
    })
    .eq('id', RECORDING_ID)
    .select();
  
  if (error) {
    console.error('Error updating recording:', error);
    console.error('This may be due to RLS - ensure you are the owner of this recording');
  } else {
    console.log('Successfully updated recording:', data);
  }
}

fixRecording().catch(console.error); 