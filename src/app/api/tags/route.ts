import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createTag, getUserTags } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

// GET: Fetch all tags for the current user
export async function GET(request: NextRequest) {
  console.log('API route called: /api/tags');
  
  try {
    // Initialize Supabase client with proper cookie handling
    const supabase = createRouteHandlerClient<Database>({ 
      cookies 
    });
    
    // Get user session from cookies
    const { data: { session } } = await supabase.auth.getSession();
    
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
    
    // The authenticated client (supabase) will automatically filter records based on RLS policies
    const { data, error } = await getUserTags(userId, supabase);
    
    if (error) {
      console.error('Database error fetching tags:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tags', details: error.message },
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
    const supabase = createRouteHandlerClient<Database>({ 
      cookies 
    });
    
    // Get user session from cookies
    const { data: { session } } = await supabase.auth.getSession();
    
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
    
    // Create the tag
    const { data, error } = await createTag(name.trim(), userId, supabase);
    
    if (error) {
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Tag already exists' },
          { status: 409 }
        );
      }
      
      console.error('Database error creating tag:', error);
      return NextResponse.json(
        { error: 'Failed to create tag', details: error.message },
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