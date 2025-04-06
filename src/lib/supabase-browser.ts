'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Create a Supabase client for client-side use with proper cookie handling
export const supabaseBrowser = createClientComponentClient(); 