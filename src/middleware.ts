import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Constants for caching
const SESSION_CACHE_COOKIE = 'sb-session-cache';
const SESSION_EXPIRY_COOKIE = 'sb-session-expiry';
const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer before actual expiration

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
    
    // Check if we have a cached session that's still valid
    const cachedSessionExpiry = request.cookies.get(SESSION_EXPIRY_COOKIE)?.value;
    const hasValidCache = cachedSessionExpiry && (parseInt(cachedSessionExpiry) > Date.now() + EXPIRY_BUFFER_MS);
    const cachedSession = request.cookies.get(SESSION_CACHE_COOKIE)?.value;
    
    let session = null;
    let error = null;
    
    if (hasValidCache && cachedSession) {
      // Use cached session without making a network request
      console.log(`[Middleware] Using cached session for: ${request.nextUrl.pathname}, valid until: ${new Date(parseInt(cachedSessionExpiry)).toISOString()}`);
      try {
        session = JSON.parse(cachedSession);
      } catch (e) {
        console.error('[Middleware] Error parsing cached session:', e);
        // If we can't parse the cached session, we'll fetch a new one
      }
    } else {
      // No valid cache, need to refresh the session
      console.log(`[Middleware] No valid session cache, fetching for: ${request.nextUrl.pathname}`);
      const { data, error: sessionError } = await supabase.auth.getSession();
      session = data.session;
      error = sessionError;
      
      // If we got a valid session, cache it
      if (session && !sessionError) {
        // Calculate expiry time (convert from seconds to milliseconds)
        const expiryTime = session.expires_at 
          ? session.expires_at * 1000 
          : Date.now() + (60 * 60 * 1000); // Default 1hr if no expiry
        
        // Set the session cache cookies
        res.cookies.set(SESSION_CACHE_COOKIE, JSON.stringify(session), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          maxAge: Math.floor((expiryTime - Date.now()) / 1000) // Convert ms to seconds
        });
        
        res.cookies.set(SESSION_EXPIRY_COOKIE, expiryTime.toString(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          maxAge: Math.floor((expiryTime - Date.now()) / 1000) // Convert ms to seconds
        });
        
        console.log(`[Middleware] Session cached until: ${new Date(expiryTime).toISOString()}`);
      }
    }
    
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
    console.log(`[Middleware] Session valid for: ${request.nextUrl.pathname}, allowing request.`);
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