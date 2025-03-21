import { NextRequest, NextResponse } from 'next/server';
// We'll need to manually implement Deepgram API since we couldn't install the SDK due to permission issues
// In a production app, you would use: import { Deepgram } from '@deepgram/sdk';

// Import OpenAI for Whisper fallback
import { OpenAI } from 'openai';
// Import from Vercel Blob to fetch uploaded files - temporarily commenting out until we can fix import
// import { list, get, del } from '@vercel/blob';

// Check which transcription service to use
const USE_DEEPGRAM = process.env.USE_DEEPGRAM === 'true';

// Initialize OpenAI client if needed
const openai = USE_DEEPGRAM ? null : new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supported audio content types
const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg', // MP3
  'audio/wav',  // WAV
  'audio/m4a',  // M4A
  'audio/x-m4a', // M4A (alternative MIME type)
  'audio/aac',  // AAC
  'audio/ogg',  // OGG
  'audio/mp4',  // MP4 audio
  'audio/x-mp4', // MP4 audio (alternative MIME type)
];

// Define types for Deepgram response
interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

interface DeepgramUtterance {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
  start: number;
  end: number;
  speaker: number;
}

interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
}

interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

interface DeepgramResults {
  utterances?: DeepgramUtterance[];
  channels?: DeepgramChannel[];
}

interface DeepgramResponse {
  results: DeepgramResults;
}

// Maximum file size for OpenAI Whisper (25MB in bytes)
// Deepgram has a much higher limit (up to 250MB)
const MAX_FILE_SIZE_WHISPER = 25 * 1024 * 1024;
const MAX_FILE_SIZE_DEEPGRAM = 250 * 1024 * 1024; // Deepgram supports much larger files

export const config = {
  api: {
    // Disable the default body parser to handle large files
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    console.log('API route called: /api/transcribe');
    console.log(`Using transcription service: ${USE_DEEPGRAM ? 'Deepgram' : 'OpenAI Whisper'}`);
    
    // Set max file size based on the service being used
    const MAX_FILE_SIZE = USE_DEEPGRAM ? MAX_FILE_SIZE_DEEPGRAM : MAX_FILE_SIZE_WHISPER;
    
    console.log('Parsing form data...');
    const formData = await request.formData();
    
    // Check if we're receiving a blob URL or a direct file upload
    const blobUrl = formData.get('blobUrl') as string;
    
    let buffer: Buffer;
    let fileName: string;
    let fileType: string;
    let fileSize: number;
    
    if (blobUrl) {
      console.log('Blob URL received:', blobUrl);
      fileName = formData.get('fileName') as string;
      
      // Fetch the blob directly using fetch API instead of Vercel Blob SDK
      try {
        const response = await fetch(blobUrl);
        if (!response.ok) {
          return NextResponse.json(
            { error: 'Failed to fetch file from Blob storage' },
            { status: 500 }
          );
        }
        
        console.log('Blob fetched successfully:', {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          status: response.status
        });
        
        fileType = response.headers.get('content-type') || 'audio/mpeg';
        fileSize = parseInt(response.headers.get('content-length') || '0');
        
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        
        console.log('Buffer created from blob, size:', buffer.length);
      } catch (error) {
        console.error('Error fetching from blob URL:', error);
        return NextResponse.json(
          { error: 'Failed to fetch file from Blob URL' },
          { status: 500 }
        );
      }
    } else {
      // Handle direct file upload case (for smaller files or local development)
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
      
      fileName = audioFile.name;
      fileType = audioFile.type;
      fileSize = audioFile.size;

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
            error: `File size (${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB) exceeds the limit of ${USE_DEEPGRAM ? '250MB' : '25MB'}.`,
            suggestion: 'Please use a smaller audio file or try a different format.'
          },
          { status: 413 }
        );
      }
      
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
            error: `File size (${(audioFile.size / 1024 / 1024).toFixed(2)} MB) exceeds the limit of ${USE_DEEPGRAM ? '250MB' : '25MB'}.`,
            suggestion: 'Please use a smaller audio file or try a different format.'
          },
          { status: 413 }
        );
      }

      console.log('Converting file to buffer...');
      // Convert the file to a Buffer
      const arrayBuffer = await audioFile.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log('Buffer created, size:', buffer.length);
    }

    // Create a virtual file object for the transcription services
    const virtualFile = {
      name: fileName,
      type: fileType,
      size: fileSize
    };

    try {
      if (USE_DEEPGRAM) {
        return await processWithDeepgram(virtualFile, buffer);
      } else {
        return await processWithOpenAI(virtualFile, buffer);
      }
    } catch (error: unknown) {
      console.error(`${USE_DEEPGRAM ? 'Deepgram' : 'OpenAI'} API error:`, error);
      
      // Handle specific API errors
      if (
        (USE_DEEPGRAM && error instanceof Error && error.message.includes('413')) ||
        (!USE_DEEPGRAM && typeof error === 'object' && error !== null && 'status' in error && (error as any).status === 413)
      ) {
        return NextResponse.json(
          { 
            error: 'The audio file is too large for processing.',
            suggestion: 'Please use a smaller audio file or try a different format.'
          },
          { status: 413 }
        );
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Function to process audio with Deepgram
async function processWithDeepgram(audioFile: { name: string, type: string, size: number }, buffer: Buffer) {
  console.log('Calling Deepgram API for transcription...');
  
  // Deepgram API endpoint
  const url = 'https://api.deepgram.com/v1/listen';
  
  // Request parameters for Deepgram with speaker diarization
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
      'Content-Type': audioFile.type
    },
    body: buffer
  };
  
  // Build the URL with query parameters for speaker diarization
  const params = new URLSearchParams({
    diarize: 'true',    // Enable speaker diarization
    speakers: '2',      // Expected number of speakers (adjust based on your needs)
    punctuate: 'true',  // Add punctuation
    utterances: 'true', // Get utterance-level timestamps
    model: 'nova-2',    // Use Nova-2 model for best accuracy
  });
  
  // Send request to Deepgram
  const response = await fetch(`${url}?${params.toString()}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Deepgram API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });
    
    throw new Error(`Deepgram API error: ${response.status} ${response.statusText}`);
  }
  
  const transcriptionData = await response.json() as DeepgramResponse;
  console.log('Transcription received, processing segments...');
  
  // Process the utterances with speaker identification
  const utterances = transcriptionData.results?.utterances || [];
  console.log('Number of utterances:', utterances.length);
  
  // Map Deepgram utterances to our segment format
  const processedSegments = utterances.map((utterance: DeepgramUtterance) => {
    return {
      text: utterance.transcript,
      startTime: utterance.start,
      endTime: utterance.end,
      speaker: `Speaker ${utterance.speaker}`,
    };
  });
  
  // If diarization failed or wasn't available, fall back to segments without speaker info
  if (processedSegments.length === 0 && transcriptionData.results?.channels?.[0]?.alternatives?.[0]) {
    const words = transcriptionData.results.channels[0].alternatives[0].words || [];
    
    // Group words into reasonable segments
    const segments = [];
    let currentSegment = { text: '', startTime: 0, endTime: 0 };
    let wordCount = 0;
    
    for (const word of words) {
      if (wordCount === 0) {
        currentSegment.startTime = word.start;
      }
      
      currentSegment.text += (currentSegment.text ? ' ' : '') + word.word;
      currentSegment.endTime = word.end;
      wordCount++;
      
      // Create a new segment every ~20 words or at natural punctuation
      if (wordCount >= 20 || /[.!?]$/.test(word.word)) {
        segments.push({ ...currentSegment });
        currentSegment = { text: '', startTime: 0, endTime: 0 };
        wordCount = 0;
      }
    }
    
    // Add the last segment if it's not empty
    if (currentSegment.text) {
      segments.push(currentSegment);
    }
    
    console.log('Created segments from words:', segments.length);
    return NextResponse.json({ transcript: segments });
  }

  console.log('Transcription processing complete:', {
    segmentsCount: processedSegments.length
  });

  return NextResponse.json({
    transcript: processedSegments
  });
}

// Function to process audio with OpenAI Whisper
async function processWithOpenAI(audioFile: { name: string, type: string, size: number }, buffer: Buffer) {
  console.log('Calling OpenAI API for transcription...');
  
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }
  
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
      // No speaker info available with Whisper
    };
  });

  console.log('Transcription processing complete:', {
    segmentsCount: processedSegments.length
  });

  return NextResponse.json({
    transcript: processedSegments
  });
} 