'use client';

import { useState, useEffect } from 'react';
import AudioUploader from './components/AudioUploader';
import TranscriptDisplay from './components/TranscriptDisplay';
import MeetingNotes from './components/MeetingNotes';

interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
} 

interface Notes {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
}

interface ErrorWithSuggestion {
  message: string;
  suggestion?: string;
}

export default function Home() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [notes, setNotes] = useState<Notes | null>(null);
  const [error, setError] = useState<ErrorWithSuggestion | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [totalSegments, setTotalSegments] = useState(0);

  // Notify the AudioUploader component when transcription is complete
  useEffect(() => {
    if (!isTranscribing && (window as any).onTranscriptionComplete) {
      console.log('Notifying AudioUploader that transcription is complete');
      (window as any).onTranscriptionComplete();
    }
  }, [isTranscribing]);

  const handleFileUpload = async (file: File, isLastSegment: boolean) => {
    try {
      console.log('handleFileUpload called with file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        isLastSegment
      });
      
      // Check if this is a segment file
      const isSegment = file.name.includes('segment_');
      
      if (isSegment) {
        // Extract segment information from filename
        const segmentMatch = file.name.match(/segment_(\d+)_of_(\d+)/);
        if (segmentMatch) {
          const segmentNumber = parseInt(segmentMatch[1]);
          const totalSegmentsCount = parseInt(segmentMatch[2]);
          setCurrentSegment(segmentNumber);
          setTotalSegments(totalSegmentsCount);
          setProcessingMessage(`Processing segment ${segmentNumber} of ${totalSegmentsCount}`);
        }
      } else {
        setProcessingMessage(null);
        setCurrentSegment(0);
        setTotalSegments(0);
      }
      
      setIsTranscribing(true);
      setError(null);
      
      // Only clear transcript for first segment or non-segmented files
      if (!isSegment || file.name.includes('segment_1_of_')) {
        setTranscript([]);
        setNotes(null);
      }

      const formData = new FormData();
      formData.append('file', file);
      console.log('FormData created, sending to API...');

      console.log('Sending POST request to /api/transcribe');
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        console.error('API error response:', {
          status: response.status,
          error: data.error,
          suggestion: data.suggestion
        });
        
        setError({
          message: data.error || 'Failed to transcribe audio',
          suggestion: data.suggestion
        });
        return;
      }

      console.log('Transcription successful:', {
        segmentsCount: data.transcript.length,
        currentSegment,
        totalSegments,
        isLastSegment
      });
      
      // For segmented files, append the new transcript to the existing one
      if (isSegment && transcript.length > 0) {
        // Calculate time offset based on the last segment's end time
        const lastEndTime = transcript[transcript.length - 1].endTime;
        
        // Adjust timestamps for the new segments
        const adjustedNewSegments = data.transcript.map((segment: TranscriptSegment) => ({
          ...segment,
          startTime: segment.startTime + lastEndTime,
          endTime: segment.endTime + lastEndTime
        }));
        
        setTranscript([...transcript, ...adjustedNewSegments]);
      } else {
        setTranscript(data.transcript);
      }
      
      // Clear processing message after successful transcription
      setProcessingMessage(null);
    } catch (err: any) {
      console.error('Error in handleFileUpload:', err);
      setError({
        message: err instanceof Error ? err.message : 'An unknown error occurred',
        suggestion: undefined
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleGenerateNotes = async (additionalInstructions: string = '') => {
    try {
      console.log('handleGenerateNotes called');
      setIsGeneratingNotes(true);
      setError(null);

      // Format the transcript for the AI to process
      const formattedTranscript = transcript.map(segment => {
        return `(${formatTime(segment.startTime)}): ${segment.text}`;
      }).join('\n\n');

      console.log('Sending POST request to /api/generate-notes');
      const response = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          transcript: formattedTranscript,
          additionalInstructions: additionalInstructions
        }),
      });

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        if (data && typeof data === 'object') {
          console.error('API error response:', {
            status: response.status,
            error: data.error,
            suggestion: data.suggestion
          });
          
          setError({
            message: data.error || 'Failed to generate meeting notes',
            suggestion: data.suggestion
          });
        } else {
          setError({
            message: 'Failed to generate meeting notes',
            suggestion: 'An unexpected error occurred'
          });
        }
        return;
      }

      console.log('Notes generation successful');
      setNotes(data);
    } catch (err: any) {
      console.error('Error in handleGenerateNotes:', err);
      setError({
        message: err instanceof Error ? err.message : 'An unknown error occurred',
        suggestion: undefined
      });
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Helper function to format time
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight">
            <span className="block">Audio Meeting Notes</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Upload an audio recording of your meeting to get a transcript and generate meeting notes.
          </p>
        </div>

        <div className="space-y-10">
          <AudioUploader onFileUpload={handleFileUpload} isLoading={isTranscribing} />

          {error && (
            <div className="w-full max-w-2xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{error.message}</p>
                    {error.suggestion && (
                      <p className="mt-1 font-medium">{error.suggestion}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(isTranscribing || processingMessage) && (
            <div className="w-full max-w-2xl mx-auto text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {processingMessage || 'Transcribing your audio file...'}
              </p>
              {currentSegment > 0 && totalSegments > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${(currentSegment / totalSegments) * 100}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                    Segment {currentSegment} of {totalSegments}
                  </p>
                </div>
              )}
            </div>
          )}

          {notes && <MeetingNotes notes={notes} />}

          {transcript.length > 0 && (
            <TranscriptDisplay 
              transcript={transcript}
              isGeneratingNotes={isGeneratingNotes}
              onGenerateNotes={handleGenerateNotes}
            />
          )}
        </div>
      </div>
    </div>
  );
}
