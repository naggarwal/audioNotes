'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase-browser';

// Global state to track rate limit across components
let isGlobalRateLimited = false;
let rateLimitResetTime = 0;

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
  const [lastSignInAttempt, setLastSignInAttempt] = useState<number>(0);
  const [signInAttempts, setSignInAttempts] = useState<number>(0);
  const sessionFetchedRef = useRef(false);

  useEffect(() => {
    // Get session on load - only once
    const getSession = async () => {
      if (sessionFetchedRef.current) return;
      
      // Check global rate limit before proceeding
      if (isGlobalRateLimited && Date.now() < rateLimitResetTime) {
        console.log(`Global rate limit active, delaying session fetch until ${new Date(rateLimitResetTime).toISOString()}`);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      console.log('Fetching authentication session...');
      
      try {
        sessionFetchedRef.current = true; // Mark as fetched before the async call
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
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session ? 'user authenticated' : 'no session');
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle rate limiting with exponential backoff
  const handleRateLimit = () => {
    // Set global rate limit flag
    isGlobalRateLimited = true;
    
    // Calculate backoff time - exponential based on attempts (between 10s and 5 minutes)
    const backoffTime = Math.min(10000 * Math.pow(2, signInAttempts), 300000);
    rateLimitResetTime = Date.now() + backoffTime;
    
    console.log(`Rate limit applied. Backing off for ${backoffTime/1000}s until ${new Date(rateLimitResetTime).toISOString()}`);
    
    // Reset the global rate limit after the backoff time
    setTimeout(() => {
      console.log('Rate limit reset');
      isGlobalRateLimited = false;
      setSignInAttempts(0);
    }, backoffTime);
  };

  const signUp = async (email: string, password: string) => {
    // Check global rate limit first
    if (isGlobalRateLimited && Date.now() < rateLimitResetTime) {
      console.log(`Global rate limit active, cannot sign up until ${new Date(rateLimitResetTime).toISOString()}`);
      return { 
        error: { 
          message: `Too many authentication attempts. Please try again after ${new Date(rateLimitResetTime).toLocaleTimeString()}.` 
        } 
      };
    }
    
    const { error } = await supabaseBrowser.auth.signUp({ email, password });
    if (error) {
      console.error('Sign up error:', error);
      // Check for rate limit error
      if (error.message === 'Request rate limit reached') {
        handleRateLimit();
      }
    } else {
      console.log('Sign up successful');
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    
    // Check global rate limit first
    if (isGlobalRateLimited && Date.now() < rateLimitResetTime) {
      console.log(`Global rate limit active, cannot sign in until ${new Date(rateLimitResetTime).toISOString()}`);
      return { 
        error: { 
          message: `Too many authentication attempts. Please try again after ${new Date(rateLimitResetTime).toLocaleTimeString()}.` 
        } 
      };
    }
    
    // Rate limiting logic
    const now = Date.now();
    const timeSinceLastAttempt = now - lastSignInAttempt;
    
    // If we've made multiple attempts in a short period, add a delay
    if (signInAttempts > 3 && timeSinceLastAttempt < 10000) {
      const waitTime = 10000 - timeSinceLastAttempt;
      console.log(`Rate limiting: waiting ${waitTime}ms before next attempt`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Update attempt tracking
    setLastSignInAttempt(Date.now());
    setSignInAttempts(prev => prev + 1);
    
    // Attempt sign in
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Sign in error:', error);
      // Check for rate limit error
      if (error.message === 'Request rate limit reached') {
        handleRateLimit();
      }
    } else {
      console.log('Sign in successful');
      // Reset attempts on success
      setSignInAttempts(0);
    }
    return { error };
  };

  const signOut = async () => {
    // Check global rate limit first
    if (isGlobalRateLimited && Date.now() < rateLimitResetTime) {
      console.log(`Global rate limit active, delaying sign out until ${new Date(rateLimitResetTime).toISOString()}`);
      return;
    }
    
    console.log('Signing out...');
    try {
      await supabaseBrowser.auth.signOut();
      setUser(null);
      setSession(null);
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