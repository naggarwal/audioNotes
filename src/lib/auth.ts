import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';

// Session caching to reduce token requests
let cachedSession: Session | null = null;
let sessionExpiry = 0;
const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer

// A simple auth function to get the current session with caching
export async function auth() {
  const now = Date.now();
  
  // Use cached session if it's still valid
  if (cachedSession && sessionExpiry > now + EXPIRY_BUFFER_MS) {
    console.log('Using cached session in auth.ts');
    return cachedSession;
  }
  
  // Otherwise fetch a new session
  console.log('Fetching new session in auth.ts');
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }
  
  if (data?.session) {
    // Cache the session with its expiry time
    cachedSession = data.session;
    sessionExpiry = data.session.expires_at ? data.session.expires_at * 1000 : now + (60 * 60 * 1000);
    console.log(`Session cached in auth.ts until: ${new Date(sessionExpiry).toISOString()}`);
  } else {
    cachedSession = null;
    sessionExpiry = 0;
  }
  
  return data?.session || null;
} 