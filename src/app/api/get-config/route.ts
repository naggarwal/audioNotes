import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  console.log('API route called: /api/get-config');
  
  try {
    // Initialize Supabase client for authentication
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get user session using the Auth Helper client
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Handle potential errors getting the session, but don't fail the request
    // as this endpoint provides public config too.
    if (sessionError) {
      console.error('Error getting session in /api/get-config:', sessionError);
      // Log the error but proceed to return public config
    }
    
    // Log session info for debugging
    console.log('Authentication check for get-config:', {
      isAuthenticated: !!session,
      userId: session?.user?.id || 'not authenticated'
    });
    
    // Configuration that should be available without authentication
    const publicConfig = {
      uploadMode: process.env.UPLOAD_MODE || 'blob',
      useDeepgram: process.env.USE_DEEPGRAM === 'true',
      maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '250'),
      environment: process.env.NODE_ENV
    };
    
    // Configuration that is only available when authenticated
    const privateConfig = session ? {
      userId: session.user.id,
      userEmail: session.user.email
    } : null;
    
    return NextResponse.json({
      config: {
        ...publicConfig,
        user: privateConfig
      }
    });

  } catch (error) {
    // Catch any unexpected errors during the process
    console.error('Unexpected error in /api/get-config:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 