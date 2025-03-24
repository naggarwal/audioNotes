import { NextRequest, NextResponse } from 'next/server';
import { getAllRecordings } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await getAllRecordings();
    
    if (error) {
      console.error('Error fetching recordings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recordings' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ recordings: data });
  } catch (error) {
    console.error('Unexpected error fetching recordings:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 