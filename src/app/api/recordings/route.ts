import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  console.log('API route called: /api/recordings');
  
  try {
    // Initialize Supabase client for authentication using cookies
    // This automatically transfers session information from the browser
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    
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
    
    console.log('Fetching recordings for user:', userId);
    
    // The authenticated client (supabase) will automatically filter records based on RLS policies
    // No need to manually filter by user_id, RLS will handle it
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .order('created_at', { ascending: false });
    
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