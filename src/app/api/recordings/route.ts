import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { findRecordingsByTags } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export async function GET(request: NextRequest) {
  console.log('API route called: /api/recordings');
  
  try {
    // Initialize Supabase client with proper cookie handling
    const supabase = createRouteHandlerClient<Database>({ 
      cookies 
    });
    
    // Get user session from cookies
    const { data: { session } } = await supabase.auth.getSession();
    
    // Log session info for debugging
    console.log('Authentication check for recordings:', {
      isAuthenticated: !!session,
      userId: session?.user?.id || 'not authenticated'
    });
    
    // Verify user is authenticated
    const userId = session?.user?.id;
    if (!userId) {
      console.log('No authenticated user found - returning 401');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check for tag filtering
    const url = new URL(request.url);
    const tagIds = url.searchParams.get('tags');
    
    let result;
    
    if (tagIds) {
      // Parse the comma-separated tag IDs
      const tagIdArray = tagIds.split(',').filter(id => id.trim() !== '');
      
      if (tagIdArray.length > 0) {
        console.log(`Filtering recordings for user ${userId} by tags:`, tagIdArray);
        
        // Use the specialized function to find recordings by tags
        result = await findRecordingsByTags(tagIdArray, userId, supabase);
      } else {
        // Fallback to regular query if no valid tag IDs
        console.log('Fetching all recordings for user:', userId);
        
        result = await supabase
          .from('recordings')
          .select('*')
          .order('created_at', { ascending: false });
      }
    } else {
      // No tag filtering, fetch all recordings
      console.log('Fetching all recordings for user:', userId);
      
      result = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: false });
    }
    
    const { data, error } = result;
    
    if (error) {
      console.error('Database error fetching recordings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recordings', details: error.message },
        { status: 500 }
      );
    }
    
    console.log(`Found ${data?.length || 0} recordings for authenticated user`);
    return NextResponse.json({ recordings: data });
  } catch (error) {
    console.error('Unexpected error fetching recordings:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 