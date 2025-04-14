import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  getRecordingTags, 
  addTagsToRecording, 
  removeTagFromRecording,
  getUserTags
} from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

// Helper function to extract the recording ID from the URL
function getRecordingId(request: Request): string {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  return pathSegments[pathSegments.length - 2]; // /api/recordings/[id]/tags
}

// GET: Fetch all tags for a specific recording
export async function GET(request: NextRequest) {
  console.log('API route called: GET /api/recordings/[id]/tags');
  
  try {
    // Initialize Supabase client with proper cookie handling
    const supabase = createRouteHandlerClient<Database>({ 
      cookies 
    });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Verify user is authenticated
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get recording ID from URL
    const recordingId = getRecordingId(request);
    if (!recordingId) {
      return NextResponse.json(
        { error: 'Recording ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Fetching tags for recording: ${recordingId}`);
    
    // Get tags for the recording
    const { data: tags, error } = await getRecordingTags(recordingId, supabase);
    
    if (error) {
      console.error('Database error fetching recording tags:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recording tags', details: error.message },
        { status: 500 }
      );
    }
    
    // Also fetch all available tags for the user for easier selection in the UI
    const { data: userTags, error: userTagsError } = await getUserTags(userId, supabase);
    
    if (userTagsError) {
      console.error('Database error fetching user tags:', userTagsError);
    }
    
    return NextResponse.json({
      recordingTags: tags || [],
      availableTags: userTags || []
    });
  } catch (error) {
    console.error('Unexpected error fetching recording tags:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST: Add tags to a recording
export async function POST(request: NextRequest) {
  console.log('API route called: POST /api/recordings/[id]/tags');
  
  try {
    // Initialize Supabase client with proper cookie handling
    const supabase = createRouteHandlerClient<Database>({ 
      cookies 
    });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Verify user is authenticated
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get recording ID from URL
    const recordingId = getRecordingId(request);
    if (!recordingId) {
      return NextResponse.json(
        { error: 'Recording ID is required' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { tagIds } = body;
    
    // Validate request
    if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json(
        { error: 'Tag IDs are required' },
        { status: 400 }
      );
    }
    
    console.log(`Adding tags to recording ${recordingId}:`, tagIds);
    
    // Add tags to the recording
    const { error } = await addTagsToRecording(recordingId, tagIds, supabase);
    
    if (error) {
      console.error('Database error adding tags to recording:', error);
      return NextResponse.json(
        { error: 'Failed to add tags to recording', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Tags added successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error adding tags to recording:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE: Remove a tag from a recording
export async function DELETE(request: NextRequest) {
  console.log('API route called: DELETE /api/recordings/[id]/tags');
  
  try {
    // Initialize Supabase client with proper cookie handling
    const supabase = createRouteHandlerClient<Database>({ 
      cookies 
    });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Verify user is authenticated
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get recording ID from URL
    const recordingId = getRecordingId(request);
    if (!recordingId) {
      return NextResponse.json(
        { error: 'Recording ID is required' },
        { status: 400 }
      );
    }
    
    // Parse query parameters for tag ID
    const url = new URL(request.url);
    const tagId = url.searchParams.get('tagId');
    
    if (!tagId) {
      return NextResponse.json(
        { error: 'Tag ID is required as a query parameter' },
        { status: 400 }
      );
    }
    
    console.log(`Removing tag ${tagId} from recording ${recordingId}`);
    
    // Remove the tag from the recording
    const { error } = await removeTagFromRecording(recordingId, tagId, supabase);
    
    if (error) {
      console.error('Database error removing tag from recording:', error);
      return NextResponse.json(
        { error: 'Failed to remove tag from recording', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Tag removed successfully' }
    );
  } catch (error) {
    console.error('Unexpected error removing tag from recording:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 