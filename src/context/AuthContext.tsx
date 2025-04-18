'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase-browser';

// Global state to track rate limit across components
let isGlobalRateLimited = false;
let rateLimitResetTime = 0;
const MAX_RATE_LIMIT_TIME = 60000; // Maximum 1 minute backoff

// Global session request tracking to prevent duplicate calls
let isSessionBeingFetched = false;
let lastSessionFetch = 0;
const SESSION_FETCH_DEBOUNCE = 2000; // Minimum 2 seconds between session fetches
const AUTH_ACTION_DEBOUNCE = 2000; // Minimum 2 seconds between auth actions

// Names of cache cookies used in middleware (must match middleware.ts)
const SESSION_CACHE_COOKIE = 'sb-session-cache';
const SESSION_EXPIRY_COOKIE = 'sb-session-expiry';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAuthActionTime, setLastAuthActionTime] = useState<number>(0);
  const [signInAttempts, setSignInAttempts] = useState<number>(0);
  const sessionFetchedRef = useRef(false);

  useEffect(() => {
    // Get session on load - only once
    const getSession = async () => {
      // Multiple protection mechanisms to prevent excessive calls
      if (sessionFetchedRef.current) return;
      
      // Global tracking to prevent concurrent requests
      if (isSessionBeingFetched) {
        console.log('Session fetch already in progress, skipping duplicate request');
        return;
      }
      
      // Debounce session fetches
      const now = Date.now();
      if (now - lastSessionFetch < SESSION_FETCH_DEBOUNCE) {
        console.log(`Session fetch debounced, last fetch was ${now - lastSessionFetch}ms ago`);
        return;
      }
      
      // Check global rate limit before proceeding
      if (isGlobalRateLimited && Date.now() < rateLimitResetTime) {
        console.log(`Rate limit active, delaying session fetch until ${new Date(rateLimitResetTime).toISOString()}`);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      console.log('Fetching authentication session...');
      
      // Set flags to prevent duplicate requests
      isSessionBeingFetched = true;
      lastSessionFetch = now;
      sessionFetchedRef.current = true;
      
      try {
        const { data: { session }, error } = await supabaseBrowser.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Check for rate limit error
          if (error.message === 'Request rate limit reached') {
            handleRateLimit();
          }
        }
        
        if (!error && session) {
          console.log('Session found:', { 
            userId: session.user?.id,
            email: session.user?.email,
            expires: new Date(session.expires_at! * 1000).toISOString()
          });
          setSession(session);
          setUser(session.user);
        } else {
          console.log('No active session found');
        }
      } catch (err) {
        console.error('Unexpected error getting session:', err);
      } finally {
        setIsLoading(false);
        // Reset the flag to allow future fetches if needed
        isSessionBeingFetched = false;
      }
    };

    getSession();

    // Listen for auth changes - but with a specific client that won't
    // automatically trigger additional getSession calls
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session ? 'user authenticated' : 'no session');
        
        // Don't trigger additional API requests for session
        if (session) {
          setSession(session);
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle rate limiting with more forgiving backoff
  const handleRateLimit = () => {
    // Set global rate limit flag
    isGlobalRateLimited = true;
    
    // Calculate backoff time - linear based on attempts with a maximum cap
    const backoffTime = Math.min(5000 + (signInAttempts * 1000), MAX_RATE_LIMIT_TIME);
    rateLimitResetTime = Date.now() + backoffTime;
    
    console.log(`Rate limit applied. Backing off for ${backoffTime/1000}s until ${new Date(rateLimitResetTime).toISOString()}`);
    
    // Reset ONLY the global rate limit flag after the backoff time.
    // signInAttempts should only reset on successful login.
    setTimeout(() => {
      console.log('Client-side rate limit window expired.');
      isGlobalRateLimited = false;
    }, backoffTime);
  };

  const signUp = async (email: string, password: string) => {
    // Debounce sign-up attempts
    const now = Date.now();
    if (now - lastAuthActionTime < AUTH_ACTION_DEBOUNCE) {
      console.log('Sign-up attempt debounced (too frequent)');
      return { 
        error: { 
          message: 'Please wait a moment before trying again. (Client debounce)' 
        } 
      };
    }
    
    // Check global rate limit first
    if (isGlobalRateLimited && Date.now() < rateLimitResetTime) {
      const waitTimeSeconds = Math.ceil((rateLimitResetTime - Date.now()) / 1000);
      console.log(`Rate limit active, cannot sign up until ${new Date(rateLimitResetTime).toISOString()}`);
      return { 
        error: { 
          message: `Rate limited. Please wait ${waitTimeSeconds} seconds before trying again.` 
        } 
      };
    }
    
    // Update attempt tracking
    setLastAuthActionTime(now);
    // Increment attempts for signup as well to contribute to backoff if spammed
    setSignInAttempts(prev => prev + 1);
    
    try {
      const { error } = await supabaseBrowser.auth.signUp({ email, password });
      if (error) {
        console.error('Sign up error:', error);
        // Handle rate limit errors specifically
        if (error.message === 'Request rate limit reached') {
          handleRateLimit();
          return { 
            error: { 
              message: 'Too many sign-up attempts (server). Please wait a moment before trying again.' 
            } 
          };
        }
        return { error };
      } else {
        console.log('Sign up successful');
        // Reset attempts on success
        setSignInAttempts(0);
        return { error: null };
      }
    } catch (err) {
      console.error('Unexpected error during sign up:', err);
      return { 
        error: { 
          message: 'An unexpected error occurred. Please try again.' 
        } 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    
    // Debounce sign-in attempts
    const now = Date.now();
    if (now - lastAuthActionTime < AUTH_ACTION_DEBOUNCE) {
      console.log('Sign-in attempt debounced (too frequent)');
      return { 
        error: { 
          message: 'Please wait a moment before trying again. (Client debounce)' 
        } 
      };
    }
    
    // Check global rate limit first
    if (isGlobalRateLimited && Date.now() < rateLimitResetTime) {
      const waitTimeSeconds = Math.ceil((rateLimitResetTime - Date.now()) / 1000);
      console.log(`Rate limit active, cannot sign in until ${new Date(rateLimitResetTime).toISOString()}`);
      return { 
        error: { 
          message: `Rate limited. Please wait ${waitTimeSeconds} seconds before trying again.` 
        } 
      };
    }
    
    // Update attempt tracking
    setLastAuthActionTime(now);
    setSignInAttempts(prev => prev + 1);
    
    try {
      // Attempt sign in
      const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Sign in error:', error);
        // Handle rate limit errors specifically
        if (error.message === 'Request rate limit reached') {
          handleRateLimit(); // Trigger client-side backoff window
          return { 
            error: { 
              message: 'Too many login attempts (server). Please wait a moment before trying again.' 
            } 
          };
        }
        // Don't reset attempts for other errors (e.g., wrong password)
        return { error };
      } else {
        console.log('Sign in successful');
        // Reset attempts ONLY on success
        setSignInAttempts(0);
        return { error: null };
      }
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      return { 
        error: { 
          message: 'An unexpected error occurred. Please try again.' 
        } 
      };
    }
  };

  const signOut = async () => {
    // Debounce sign-out attempts
    const now = Date.now();
    if (now - lastAuthActionTime < AUTH_ACTION_DEBOUNCE) {
      console.log('Sign-out attempt debounced (too frequent)');
      return;
    }
    
    // Check global rate limit first (less likely for signout, but good practice)
    if (isGlobalRateLimited && Date.now() < rateLimitResetTime) {
      console.log(`Rate limit active, delaying sign out until ${new Date(rateLimitResetTime).toISOString()}`);
      return;
    }
    
    // Update attempt tracking
    setLastAuthActionTime(now);
    
    console.log('Signing out...');
    try {
      await supabaseBrowser.auth.signOut();
      setUser(null);
      setSession(null);
      
      // Clear session cache cookies
      document.cookie = `${SESSION_CACHE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      document.cookie = `${SESSION_EXPIRY_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      console.log('Session cache cookies cleared');
      
      // Reset attempts on successful sign out as well
      setSignInAttempts(0);
      console.log('Sign out complete');
    } catch (err) {
      console.error('Sign out error:', err);
      // Check for rate limit error
      if (err instanceof Error && err.message === 'Request rate limit reached') {
        handleRateLimit();
      }
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 