import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createTag, getUserTags } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

// GET: Fetch all tags for the current user
export async function GET(request: NextRequest) {
  console.log('API route called: GET /api/tags');
  
  try {
    // Initialize Supabase client with proper cookie handling
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get user session using the Auth Helper client
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Handle potential errors getting the session
    if (sessionError) {
      console.error('Error getting session in /api/tags:', sessionError);
      return NextResponse.json({ error: 'Failed to get session', details: sessionError.message }, { status: 500 });
    }
    
    // Log session info for debugging
    console.log('Authentication check for tags:', {
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
    
    console.log('Fetching tags for user:', userId);
    
    // Pass the authenticated client to the database function
    const { data, error: dbError } = await getUserTags(userId, supabase);
    
    if (dbError) {
      console.error('Database error fetching tags:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch tags', details: dbError.message },
        { status: 500 }
      );
    }
    
    console.log(`Found ${data?.length || 0} tags for authenticated user`);
    return NextResponse.json({ tags: data });
  } catch (error) {
    console.error('Unexpected error fetching tags:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST: Create a new tag for the current user
export async function POST(request: NextRequest) {
  console.log('API route called: POST /api/tags');
  
  try {
    // Initialize Supabase client with proper cookie handling
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get user session using the Auth Helper client
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Handle potential errors getting the session
    if (sessionError) {
      console.error('Error getting session in POST /api/tags:', sessionError);
      return NextResponse.json({ error: 'Failed to get session', details: sessionError.message }, { status: 500 });
    }
    
    // Verify user is authenticated
    const userId = session?.user?.id;
    if (!userId) {
      console.log('No authenticated user found - returning 401');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { name } = body;
    
    // Validate request
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }
    
    console.log(`Creating tag "${name}" for user: ${userId}`);
    
    // Create the tag using the authenticated client
    const { data, error: dbError } = await createTag(name.trim(), userId, supabase);
    
    if (dbError) {
      // Check if it's a unique constraint violation
      if (dbError.code === '23505') {
        return NextResponse.json(
          { error: 'Tag already exists' },
          { status: 409 }
        );
      }
      
      console.error('Database error creating tag:', dbError);
      return NextResponse.json(
        { error: 'Failed to create tag', details: dbError.message },
        { status: 500 }
      );
    }
    
    console.log(`Created tag with ID: ${data.id}`);
    return NextResponse.json({ tag: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating tag:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 