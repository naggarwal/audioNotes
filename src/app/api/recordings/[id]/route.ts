import { NextRequest, NextResponse } from 'next/server';
import { getRecording, getTranscriptionByRecordingId, getMeetingNotes } from '../../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recordingId = params.id;
    
    if (!recordingId) {
      return NextResponse.json(
        { error: 'Recording ID is required' },
        { status: 400 }
      );
    }
    
    // Get the recording details
    const { data: recording, error: recordingError } = await getRecording(recordingId);
    
    if (recordingError) {
      console.error('Error fetching recording:', recordingError);
      return NextResponse.json(
        { error: 'Failed to fetch recording' },
        { status: 500 }
      );
    }
    
    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }
    
    // Get the transcription
    const transcriptionData = await getTranscriptionByRecordingId(recordingId);
    
    // Get meeting notes if they exist
    const { data: meetingNotes, error: meetingNotesError } = await getMeetingNotes(recordingId);
    
    if (meetingNotesError) {
      console.error('Error fetching meeting notes:', meetingNotesError);
      // Continue even if meeting notes can't be fetched
    }
    
    return NextResponse.json({
      recording,
      transcription: transcriptionData,
      meetingNotes: meetingNotes || null
    });
  } catch (error) {
    console.error('Unexpected error fetching recording:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 