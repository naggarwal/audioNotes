import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  console.log(`[Middleware] Path requested: ${request.nextUrl.pathname}`);
  try {
    // Create a response to modify
    const res = NextResponse.next();

    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ 
      req: request, 
      res 
    });
    
    console.log(`[Middleware] Calling getSession for: ${request.nextUrl.pathname}`);
    // Refresh session if expired - required for Server Components
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // If no session and trying to access a protected API route, return 401
    if ((error || !session) && request.nextUrl.pathname.startsWith('/api/')) {
      console.log(`[Middleware] No session for API route: ${request.nextUrl.pathname}, returning 401`);
      return NextResponse.json(
        { error: error?.message || 'Authentication required' },
        { status: 401 }
      );
    }

    // If no session and trying to access a protected page, redirect to login
    if ((error || !session) && !request.nextUrl.pathname.startsWith('/api/')) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      console.log(`[Middleware] No session for page: ${request.nextUrl.pathname}, redirecting to: ${redirectUrl.toString()}`);
      return NextResponse.redirect(redirectUrl);
    }
    
    // If we get here, we have a valid session
    console.log(`[Middleware] Session found for: ${request.nextUrl.pathname}, allowing request.`);
    return res;
  } catch (e) {
    // Handle any errors
    console.error(`[Middleware] Error for path ${request.nextUrl.pathname}:`, e);
    
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

// Apply middleware only to specific protected routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - signup (signup page)
     * - error (error page)
     * - / (the public root page if it should be public, otherwise remove from negative lookahead)
     *
     * We will protect specific pages and API routes explicitly instead of using a broad negative lookahead.
     */

    // Protected API routes:
    '/api/recordings/:path*',
    '/api/transcribe/:path*',
    '/api/generate-notes/:path*',
    '/api/tags/:path*',

    // Protected Pages (add any other pages that require login):
    '/', // Assuming the main page requires login
    '/dashboard/:path*',
    // Add other protected page routes here, e.g., '/profile'

    /*
     * The previous broad matcher is removed:
     * '/((?!auth|_next/static|_next/image|favicon.ico|login|signup|error).*)',
     * We now explicitly list the routes to protect.
     * Public routes like /login, /signup, /error are implicitly NOT matched and therefore not protected.
     */
  ],
} 