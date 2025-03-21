import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Authenticate users here if needed
        return {
          allowedContentTypes: [
            'audio/mpeg',
            'audio/wav', 
            'audio/m4a',
            'audio/x-m4a',
            'audio/aac',
            'audio/ogg',
            'audio/mp4',
            'audio/x-mp4'
          ],
          maxSize: 250 * 1024 * 1024, // 250MB limit
          tokenPayload: JSON.stringify({
            // Optional data to pass to onUploadCompleted
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This won't run locally unless using ngrok
        console.log('Audio upload completed', blob.url);
        
        // You could add logic here to save the audio URL to your database
        // or trigger transcription after upload
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
} 