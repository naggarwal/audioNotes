import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  try {
    // Create a response to modify
    const res = NextResponse.next();

    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ 
      req: request, 
      res 
    });
    
    // Refresh session if expired - required for Server Components
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // If there's an error or no session
    if (error || !session) {
      // For API routes, return 401 instead of redirecting
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: error?.message || 'Authentication required' },
          { status: 401 }
        );
      }
      
      // For non-API routes, redirect to login
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // If we get here, we have a valid session
    return res;
  } catch (e) {
    // Handle any errors
    console.error('Middleware error:', e);
    
    // For API routes, return 500
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Internal server error', details: e instanceof Error ? e.message : String(e) },
        { status: 500 }
      );
    }
    
    // For non-API routes, redirect to error page
    const errorUrl = request.nextUrl.clone();
    errorUrl.pathname = '/error';
    return NextResponse.redirect(errorUrl);
  }
}

// Specify which routes should be protected
export const config = {
  matcher: [
    // Protected API routes
    '/api/recordings/:path*',
    '/api/transcribe/:path*',
    '/api/generate-notes/:path*',
    
    // Protected pages
    '/dashboard/:path*',
    '/((?!auth|_next/static|_next/image|favicon.ico|login|error).*)',
  ],
} 