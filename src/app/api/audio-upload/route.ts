import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { createRecording } from '../../../lib/supabase';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Define custom interfaces for blob handling
interface CustomUploadBody {
  filename?: string;
}

interface BlobResult {
  url: string;
  pathname: string;
  contentType?: string;
}

// Extended PutBlobResult with additional properties
interface ExtendedBlobResult extends BlobResult {
  size?: number;
  id?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json();
  
  // Initialize Supabase client
  const supabase = createRouteHandlerClient({ cookies });
  
  // Get the current user's session if authenticated
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;

  try {
    const jsonResponse = await handleUpload({
      body: body as HandleUploadBody,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Get file extension and mime type from pathname
        const fileExtension = pathname.split('.').pop()?.toLowerCase() || '';
        
        // Determine file format from extension
        const fileFormat = fileExtension || null;
        
        // Map extensions to MIME types
        const mimeTypes: Record<string, string> = {
          mp3: 'audio/mpeg',
          wav: 'audio/wav',
          m4a: 'audio/x-m4a',
          aac: 'audio/aac',
          ogg: 'audio/ogg',
          mp4: 'audio/mp4',
        };
        
        // Parse client payload if available
        let payloadData = {};
        if (clientPayload) {
          try {
            payloadData = JSON.parse(clientPayload);
            console.log('Client payload provided:', payloadData);
          } catch (e) {
            console.error('Error parsing client payload:', e);
          }
        }
        
        // Allowed audio formats
        const allowedContentTypes = [
          'audio/mpeg',
          'audio/wav', 
          'audio/m4a',
          'audio/x-m4a',
          'audio/aac',
          'audio/ogg',
          'audio/mp4',
          'audio/x-mp4'
        ];
        
        // Get the original filename from the request body
        const customBody = body as CustomUploadBody;
        
        return {
          allowedContentTypes,
          maxSize: 250 * 1024 * 1024, // 250MB limit
          tokenPayload: JSON.stringify({
            fileName: pathname,
            originalFileName: (payloadData as any).originalFileName || customBody.filename || pathname,
            fileFormat: (payloadData as any).fileFormat || fileFormat,
            mimeType: (payloadData as any).mimeType || mimeTypes[fileExtension] || null,
            userId: (payloadData as any).userId || userId, // Prefer client payload userId, fall back to session
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This won't run locally unless using ngrok
        console.log('Audio upload completed', blob.url);
        
        try {
          // Parse token payload
          console.log('Parsing token payload:', tokenPayload);
          const payload = JSON.parse(tokenPayload || '{}');
          console.log('Parsed payload:', payload);
          
          // Cast blob to extended type
          const extendedBlob = blob as unknown as ExtendedBlobResult;
          
          // Log detailed information for debugging
          console.log('Creating recording with data:', {
            file_name: extendedBlob.pathname,
            original_file_name: payload.originalFileName || extendedBlob.pathname,
            file_size_bytes: extendedBlob.size || 0,
            file_format: payload.fileFormat,
            mime_type: extendedBlob.contentType || payload.mimeType,
            storage_path: extendedBlob.url,
            user_id: payload.userId // Critical field
          });
          
          // Store recording information in the database with user_id if available
          const result = await createRecording({
            file_name: extendedBlob.pathname,
            original_file_name: payload.originalFileName || extendedBlob.pathname,
            file_size_bytes: extendedBlob.size || 0,
            duration_seconds: null, // This will be updated after processing
            file_format: payload.fileFormat,
            mime_type: extendedBlob.contentType || payload.mimeType,
            storage_path: extendedBlob.url,
            user_id: payload.userId, // Use the user ID from payload
            transcription_status: 'pending',
            metadata: {
              uploadedAt: new Date().toISOString(),
              blobId: extendedBlob.id,
            },
          });
          
          console.log('Recording stored in database with result:', result);
        } catch (error) {
          console.error('Error storing recording in database:', error);
          // Log the detailed error for debugging
          if (error instanceof Error) {
            console.error('Error details:', {
              message: error.message,
              stack: error.stack
            });
          }
        }
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