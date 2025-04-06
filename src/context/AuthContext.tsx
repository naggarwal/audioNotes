'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase-browser';

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

  useEffect(() => {
    // Get session on load
    const getSession = async () => {
      setIsLoading(true);
      console.log('Fetching authentication session...');
      const { data: { session }, error } = await supabaseBrowser.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
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

      setIsLoading(false);
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

  const signUp = async (email: string, password: string) => {
    const { error } = await supabaseBrowser.auth.signUp({ email, password });
    if (error) {
      console.error('Sign up error:', error);
    } else {
      console.log('Sign up successful');
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Sign in error:', error);
    } else {
      console.log('Sign in successful');
    }
    return { error };
  };

  const signOut = async () => {
    console.log('Signing out...');
    await supabaseBrowser.auth.signOut();
    setUser(null);
    setSession(null);
    console.log('Sign out complete');
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