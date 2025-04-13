import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { getRecordingTags } from '@/lib/supabase';

export async function GET(
  request: Request
): Promise<Response> {
  try {
    // Get the ID from the URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const recordingId = pathSegments[pathSegments.length - 1];
    
    if (!recordingId) {
      return NextResponse.json({ error: 'Recording ID is required' }, { status: 400 });
    }

    // Get cookie store
    const cookieStore = cookies();
    
    // Initialize Supabase client
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    // Get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { error: 'Authentication error', details: sessionError.message },
        { status: 401 }
      );
    }
    
    if (!session) {
      console.log('No session found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.log('Fetching recording:', {
      userId: session.user.id,
      recordingId
    });
    
    // Get the recording with RLS applied
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .eq('user_id', session.user.id) // Ensure user owns the recording
      .single();
    
    if (recordingError) {
      console.error('Error fetching recording:', recordingError);
      return NextResponse.json(
        { error: recordingError.message },
        { status: 500 }
      );
    }
    
    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found or access denied' },
        { status: 404 }
      );
    }
    
    // Get the transcription if it exists
    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('recording_id', recordingId)
      .single();
    
    let transcriptSegments = [];
    if (transcription && !transcriptionError) {
      // Get transcription segments
      const { data: segmentsData, error: segmentsError } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('transcription_id', transcription.id)
        .order('segment_index', { ascending: true });
      
      if (segmentsError) {
        console.error('Error fetching segments:', segmentsError);
      } else {
        transcriptSegments = segmentsData || [];
      }
    } else if (transcriptionError) {
      console.error('Error fetching transcription:', transcriptionError);
    }
    
    // Get meeting notes if they exist
    const { data: notes, error: notesError } = await supabase
      .from('meeting_notes')
      .select('*')
      .eq('recording_id', recordingId)
      .maybeSingle();
    
    if (notesError) {
      console.error('Error fetching notes:', notesError);
    }
    
    // Get tags for the recording
    const { data: tags, error: tagsError } = await getRecordingTags(recordingId, supabase);
    
    if (tagsError) {
      console.error('Error fetching recording tags:', tagsError);
    }
    
    console.log('Successfully fetched recording data:', {
      hasRecording: !!recording,
      hasTranscription: !!transcription,
      segmentsCount: transcriptSegments.length,
      hasNotes: !!notes,
      tagsCount: tags?.length || 0
    });
    
    // Return the response
    return NextResponse.json({
      recording,
      transcription: transcription || null,
      segments: transcriptSegments,
      notes,
      tags: tags || []
    });
  } catch (error) {
    console.error('Unexpected error fetching recording:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 