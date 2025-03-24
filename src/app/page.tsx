'use client';

import { useState, useEffect } from 'react';
import AudioUploader from './components/AudioUploader';
import TranscriptDisplay from './components/TranscriptDisplay';
import MeetingNotes from './components/MeetingNotes';
import RecordingsDrawer from './components/RecordingsDrawer';
import DrawerToggleButton from './components/DrawerToggleButton';

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
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingRecording, setIsLoadingRecording] = useState(false);
  const [currentRecordingName, setCurrentRecordingName] = useState<string | null>(null);

  const handleFileUpload = async (file: File, blobUrl?: string, recordingId?: string) => {
    try {
      console.log('handleFileUpload called with file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        blobUrl: blobUrl || 'none',
        recordingId: recordingId || 'none'
      });
      
      setIsTranscribing(true);
      setError(null);
      setTranscript([]);
      setNotes(null);
      
      // Store the recording ID if provided
      if (recordingId) {
        setCurrentRecordingId(recordingId);
      }

      const formData = new FormData();
      
      // If we have a blob URL, send that instead of the file
      if (blobUrl) {
        formData.append('blobUrl', blobUrl);
        formData.append('fileName', file.name);
      } else {
        formData.append('file', file);
      }
      
      // Include the recording ID if available
      if (recordingId) {
        formData.append('recordingId', recordingId);
      }
      
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
        let errorMessage = 'Failed to transcribe audio';
        let suggestion = undefined;
        
        if (data.error) {
          errorMessage = data.error;
          
          if (data.error.includes('size')) {
            suggestion = 'Try uploading a smaller audio file or splitting your recording into smaller segments.';
          } else if (data.error.includes('format') || data.error.includes('type')) {
            suggestion = 'Make sure your audio file is in a supported format (MP3, WAV, M4A, AAC, OGG).';
          }
        }
        
        setError({ message: errorMessage, suggestion });
        setIsTranscribing(false);
        return;
      }
      
      if (data.transcript) {
        // Apply the same combining logic to newly uploaded transcripts
        const combinedTranscript = combineConsecutiveSegments(data.transcript);
        setTranscript(combinedTranscript);
        setCurrentRecordingName(file.name);
      } else {
        setError({ message: 'No transcript was returned' });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError({ message: 'Error uploading file: ' + (error instanceof Error ? error.message : String(error)) });
    } finally {
      setIsTranscribing(false);
    }
  };
  
  const handleGenerateNotes = async (additionalInstructions: string = '') => {
    if (!transcript.length) {
      setError({ message: 'No transcript available for generating notes' });
      return;
    }
    
    try {
      setIsGeneratingNotes(true);
      setError(null);
      
      // Prepare the request data
      const requestData = {
        transcript,
        instructions: additionalInstructions || undefined,
        recordingId: currentRecordingId || undefined
      };
      
      const response = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate notes');
      }
      
      // The API returns the notes directly now, not nested in a 'notes' property
      setNotes(data);
    } catch (error) {
      console.error('Error generating notes:', error);
      setError({ message: 'Error generating notes: ' + (error instanceof Error ? error.message : String(error)) });
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const handleSelectRecording = async (recordingId: string) => {
    setIsLoadingRecording(true);
    setError(null);
    setTranscript([]);
    setNotes(null);
    
    try {
      const response = await fetch(`/api/recordings/${recordingId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recording');
      }
      
      const data = await response.json();
      
      // Set the current recording ID
      setCurrentRecordingId(recordingId);
      
      // Set the recording name
      if (data.recording) {
        setCurrentRecordingName(data.recording.original_file_name);
      }
      
      // Process transcript if available
      if (data.transcription && data.transcription.segments) {
        const mappedTranscript = data.transcription.segments.map((segment: any) => ({
          text: segment.text,
          startTime: segment.start_time,
          endTime: segment.end_time,
          speaker: segment.speaker
        }));
        
        // Combine consecutive segments from same speaker
        const formattedTranscript = combineConsecutiveSegments(mappedTranscript);
        
        setTranscript(formattedTranscript);
        
        // Set meeting notes if they exist in the database
        if (data.meetingNotes) {
          // Format the notes from database format to our component format
          setNotes({
            summary: data.meetingNotes.summary || '',
            keyPoints: data.meetingNotes.key_points || [],
            actionItems: data.meetingNotes.action_items || [],
            decisions: data.meetingNotes.decisions || []
          });
        }
        // Do not auto-generate notes anymore
      }
    } catch (err) {
      console.error('Error loading recording:', err);
      setError({ 
        message: 'Failed to load recording', 
        suggestion: 'Please try again or select a different recording'
      });
    } finally {
      setIsLoadingRecording(false);
    }
  };

  // Function to combine consecutive segments from the same speaker
  const combineConsecutiveSegments = (segments: TranscriptSegment[]): TranscriptSegment[] => {
    if (!segments.length) return [];
    
    const result: TranscriptSegment[] = [];
    let currentSegment = { ...segments[0] };
    
    for (let i = 1; i < segments.length; i++) {
      const nextSegment = segments[i];
      
      // If the speakers match, combine the segments
      if (nextSegment.speaker === currentSegment.speaker) {
        currentSegment.text += ' ' + nextSegment.text;
        currentSegment.endTime = nextSegment.endTime;
      } else {
        // Different speaker, add the current one to result and start a new segment
        result.push(currentSegment);
        currentSegment = { ...nextSegment };
      }
    }
    
    // Don't forget to add the last segment
    result.push(currentSegment);
    
    return result;
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
            Audio Meeting Notes
          </h1>

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

            {(isTranscribing || isLoadingRecording) && (
              <div className="w-full max-w-2xl mx-auto text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  {isTranscribing ? 'Transcribing your audio file...' : 'Loading recording...'}
                </p>
              </div>
            )}

            {currentRecordingName && transcript.length > 0 && (
              <div className="w-full max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  {currentRecordingName}
                </h2>
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
      </main>
      
      {/* Drawer Toggle Button */}
      <DrawerToggleButton onClick={toggleDrawer} isDrawerOpen={isDrawerOpen} />
      
      {/* Recordings Drawer */}
      <RecordingsDrawer 
        isOpen={isDrawerOpen}
        onClose={toggleDrawer}
        onSelectRecording={handleSelectRecording}
        selectedRecordingId={currentRecordingId}
      />
      
      {/* Overlay when drawer is open on mobile */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={toggleDrawer}
        ></div>
      )}
    </div>
  );
}
