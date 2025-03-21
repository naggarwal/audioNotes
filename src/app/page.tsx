'use client';

import { useState } from 'react';
import AudioUploader from './components/AudioUploader';
import TranscriptDisplay from './components/TranscriptDisplay';
import MeetingNotes from './components/MeetingNotes';

interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
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

  const handleFileUpload = async (file: File) => {
    try {
      console.log('handleFileUpload called with file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2) + ' MB'
      });
      
      setIsTranscribing(true);
      setError(null);
      setTranscript([]);
      setNotes(null);

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
        segmentsCount: data.transcript.length
      });
      
      // If the transcript doesn't have speaker information, add default speakers
      let enhancedTranscript = data.transcript.map((segment: TranscriptSegment, index: number) => {
        if (!segment.speaker) {
          // Alternate between Speaker 1 and Speaker 2 if no speaker info
          return {
            ...segment,
            speaker: `Speaker ${Math.floor(index / 3) % 2 + 1}`
          };
        }
        return segment;
      });
      
      // Combine consecutive segments from the same speaker
      enhancedTranscript = combineConsecutiveSegments(enhancedTranscript);
      
      setTranscript(enhancedTranscript);
    } catch (err: any) {
      console.error('Error in handleFileUpload:', err);
      setError({
        message: err.message || 'Failed to transcribe audio',
        suggestion: 'Please try again with a different file'
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  // Function to combine consecutive segments from the same speaker
  const combineConsecutiveSegments = (segments: TranscriptSegment[]): TranscriptSegment[] => {
    if (!segments.length) return [];
    
    const combinedSegments: TranscriptSegment[] = [];
    let currentSegment = { ...segments[0] };
    
    for (let i = 1; i < segments.length; i++) {
      const nextSegment = segments[i];
      
      // If the same speaker, combine the text and update the end time
      if (nextSegment.speaker === currentSegment.speaker) {
        currentSegment.text += ' ' + nextSegment.text;
        currentSegment.endTime = nextSegment.endTime;
      } else {
        // Different speaker, push current segment and start a new one
        combinedSegments.push(currentSegment);
        currentSegment = { ...nextSegment };
      }
    }
    
    // Don't forget to add the last segment
    combinedSegments.push(currentSegment);
    
    return combinedSegments;
  };

  const handleGenerateNotes = async (additionalInstructions: string = '') => {
    try {
      if (transcript.length === 0) {
        setError({
          message: 'No transcript available',
          suggestion: 'Please upload and transcribe an audio file first'
        });
        return;
      }
      
      setIsGeneratingNotes(true);
      setError(null);
      
      // Convert transcript segments to text
      const transcriptText = transcript.map((segment, index) => {
        // Format speaker information if available
        const speakerPrefix = segment.speaker 
          ? `${segment.speaker}: ` 
          : `Speaker ${Math.floor(index / 3) % 2 + 1}: `; // Alternate speakers if not provided
          
        return `${speakerPrefix}${segment.text}`;
      }).join('\n\n');
      
      console.log('Sending transcript for notes generation:', {
        transcriptLength: transcriptText.length,
        segmentsCount: transcript.length
      });

      const response = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          transcript: transcriptText,
          additionalInstructions 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate notes');
      }

      const data = await response.json();
      console.log('Notes generated:', data);
      
      setNotes({
        summary: data.summary,
        keyPoints: data.keyPoints,
        actionItems: data.actionItems,
        decisions: data.decisions
      });
    } catch (err: any) {
      console.error('Error in handleGenerateNotes:', err);
      setError({
        message: err.message || 'Failed to generate notes',
        suggestion: 'Please try again or check your transcript'
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

          {(isTranscribing) && (
            <div className="w-full max-w-2xl mx-auto text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {'Transcribing your audio file...'}
              </p>
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
