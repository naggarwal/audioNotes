import { NextResponse } from 'next/server';

export async function GET() {
  // Get the upload mode from environment variable, default to 'auto' if not set
  const uploadMode = process.env.UPLOAD_MODE || 'auto';
  
  return NextResponse.json({
    uploadMode: uploadMode.toLowerCase(),
    useDeepgram: process.env.USE_DEEPGRAM === 'true',
    maxFileSizeDeepgram: 250, // MB
    maxFileSizeWhisper: 25,   // MB
  });
} 