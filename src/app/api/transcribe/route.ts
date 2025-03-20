import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Maximum file size allowed by OpenAI API (25MB in bytes)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const config = {
  api: {
    // Disable the default body parser to handle large files
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    console.log('API route called: /api/transcribe');
    
    // Check content length header first to avoid processing very large files
    const contentLength = request.headers.get('content-length');
    console.log('Content-Length header:', {
      contentLength,
      contentLengthInMB: contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'
    });
    
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      console.log('Content-Length exceeds limit:', {
        contentLength: parseInt(contentLength),
        maxSize: MAX_FILE_SIZE,
        contentLengthInMB: (parseInt(contentLength) / 1024 / 1024).toFixed(2) + ' MB',
        maxSizeInMB: (MAX_FILE_SIZE / 1024 / 1024).toFixed(2) + ' MB'
      });
      
      return NextResponse.json(
        { 
          error: `File size (${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB) exceeds the OpenAI API limit of 25MB.`,
          suggestion: 'Please compress your audio file, use a shorter recording, or split the file into smaller segments.'
        },
        { status: 413 }
      );
    }

    console.log('Parsing form data...');
    const formData = await request.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      console.log('No audio file provided');
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('Audio file received:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      sizeInMB: (audioFile.size / 1024 / 1024).toFixed(2) + ' MB'
    });

    // Check file size on the server side as well
    if (audioFile.size > MAX_FILE_SIZE) {
      console.log('File size exceeds limit:', {
        fileSize: audioFile.size,
        maxSize: MAX_FILE_SIZE,
        fileSizeInMB: (audioFile.size / 1024 / 1024).toFixed(2) + ' MB',
        maxSizeInMB: (MAX_FILE_SIZE / 1024 / 1024).toFixed(2) + ' MB'
      });
      
      return NextResponse.json(
        { 
          error: `File size (${(audioFile.size / 1024 / 1024).toFixed(2)} MB) exceeds the OpenAI API limit of 25MB.`,
          suggestion: 'Please compress your audio file, use a shorter recording, or split the file into smaller segments.'
        },
        { status: 413 }
      );
    }

    console.log('Converting file to buffer...');
    // Convert the file to a Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('Buffer created, size:', buffer.length);

    try {
      console.log('Calling OpenAI API for transcription...');
      // Create a transcription with timestamp segments
      const transcription = await openai.audio.transcriptions.create({
        file: new File([buffer], audioFile.name, { type: audioFile.type }),
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      console.log('Transcription received, processing segments...');
      
      // Process the segments without speaker identification
      const segments = transcription.segments || [];
      console.log('Number of segments:', segments.length);
      
      // Convert segments to our format without speaker identification
      const processedSegments = segments.map(segment => {
        return {
          text: segment.text,
          startTime: segment.start,
          endTime: segment.end,
        };
      });

      console.log('Transcription processing complete:', {
        segmentsCount: processedSegments.length
      });

      return NextResponse.json({
        transcript: processedSegments
      });
    } catch (openaiError: unknown) {
      console.error('OpenAI API error:', openaiError);
      
      // Handle specific OpenAI API errors
      if (typeof openaiError === 'object' && openaiError !== null && 'status' in openaiError && (openaiError as any).status === 413) {
        return NextResponse.json(
          { 
            error: 'The audio file is too large for the OpenAI API.',
            suggestion: 'Please compress your audio file, use a shorter recording, or split the file into smaller segments.'
          },
          { status: 413 }
        );
      }
      
      throw openaiError;
    }
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 