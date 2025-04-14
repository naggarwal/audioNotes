import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Update the specific recording
    const { data, error } = await supabase
      .from('recordings')
      .update({ 
        transcription_status: 'completed',
        duration_seconds: 2.58
      })
      .eq('id', '47ccad3f-23fc-4a10-86bd-670e11b19f4d')
      .select();
    
    if (error) {
      console.error('Error updating recording:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 