import { supabase } from './supabase';

// A simple auth function to get the current session
export async function auth() {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }
  
  return data?.session || null;
} 