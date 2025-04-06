import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  console.log('API route called: /api/get-config');
  
  // Initialize Supabase client for authentication
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
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
} 