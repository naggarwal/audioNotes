'use client';

import { useState, useEffect } from 'react';
import AudioUploader from './components/AudioUploader';
import TranscriptDisplay from './components/TranscriptDisplay';
import MeetingNotes from './components/MeetingNotes';
import RecordingsDrawer from './components/RecordingsDrawer';
import DrawerToggleButton from './components/DrawerToggleButton';
import ProcessStatus, { ProcessStage } from './components/ProcessStatus';
import { useAuth } from '@/context/AuthContext';
import TagSelector from '@/components/TagSelector';
import { Tag } from '@/lib/supabase';

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
  const { user, isLoading } = useAuth();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [notes, setNotes] = useState<Notes | null>(null);
  const [error, setError] = useState<ErrorWithSuggestion | null>(null);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingRecording, setIsLoadingRecording] = useState(false);
  const [currentRecordingName, setCurrentRecordingName] = useState<string | null>(null);
  const [processStage, setProcessStage] = useState<ProcessStage>(ProcessStage.Idle);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentRecordingTags, setCurrentRecordingTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [newRecordingTags, setNewRecordingTags] = useState<Tag[]>([]);
  const [file, setFile] = useState<File | null>(null);

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
      
      // Set the file state
      setFile(file);
      
      if (blobUrl) {
        setProcessStage(ProcessStage.Transcribing);
      } else if (processStage === ProcessStage.Idle) {
        setProcessStage(ProcessStage.Transcribing);
      }
      
      setIsTranscribing(true);
      setError(null);
      setTranscript([]);
      setNotes(null);
      
      if (recordingId) {
        setCurrentRecordingId(recordingId);
      }

      const formData = new FormData();
      
      if (blobUrl) {
        formData.append('blobUrl', blobUrl);
        formData.append('fileName', file.name);
      } else {
        formData.append('file', file);
      }
      
      if (recordingId) {
        formData.append('recordingId', recordingId);
      }
      
      // Add tags to the FormData if any are selected
      if (newRecordingTags.length > 0) {
        const tagIds = newRecordingTags.map(tag => tag.id);
        formData.append('tagIds', JSON.stringify(tagIds));
      }
      
      console.log('FormData created, sending to API...');

      console.log('Sending POST request to /api/transcribe');
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        credentials: 'include',
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
        setProcessStage(ProcessStage.Idle);
        setFile(null);
        return;
      }
      
      if (data.transcript) {
        const combinedTranscript = combineConsecutiveSegments(data.transcript);
        setTranscript(combinedTranscript);
        setCurrentRecordingName(file.name);
        setProcessStage(ProcessStage.Completed);
        
        // Reset file state on successful processing
        setTimeout(() => {
          setFile(null);
        }, 1000); // Small delay to allow UI to update
      } else {
        setError({ message: 'No transcript was returned' });
        setProcessStage(ProcessStage.Idle);
        setFile(null);
      }
      
      // Reset new recording tags after successful upload
      setNewRecordingTags([]);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError({ message: 'Error uploading file: ' + (error instanceof Error ? error.message : String(error)) });
      setProcessStage(ProcessStage.Idle);
      setFile(null);
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
        credentials: 'include',
        body: JSON.stringify(requestData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate notes');
      }
      
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
    setCurrentRecordingTags([]);
    
    try {
      const response = await fetch(`/api/recordings/${recordingId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recording');
      }
      
      const data = await response.json();
      console.log('Received recording data:', data);
      
      setCurrentRecordingId(recordingId);
      
      if (data.recording) {
        setCurrentRecordingName(data.recording.original_file_name);
      }
      
      // Handle tags if they exist
      if (data.tags && Array.isArray(data.tags)) {
        setCurrentRecordingTags(data.tags);
      }
      
      // Also refresh available tags to ensure dropdown is up-to-date
      await fetchAvailableTags();
      
      // Handle segments directly from the response
      if (data.segments && Array.isArray(data.segments)) {
        const mappedTranscript = data.segments.map((segment: any) => ({
          text: segment.text,
          startTime: segment.start_time,
          endTime: segment.end_time,
          speaker: segment.speaker
        }));
        
        const formattedTranscript = combineConsecutiveSegments(mappedTranscript);
        setTranscript(formattedTranscript);
      }
      
      // Handle notes if they exist
      if (data.notes) {
        setNotes({
          summary: data.notes.summary || '',
          keyPoints: data.notes.key_points || [],
          actionItems: data.notes.action_items || [],
          decisions: data.notes.decisions || []
        });
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

  const combineConsecutiveSegments = (segments: TranscriptSegment[]): TranscriptSegment[] => {
    if (!segments.length) return [];
    
    const result: TranscriptSegment[] = [];
    let currentSegment = { ...segments[0] };
    
    for (let i = 1; i < segments.length; i++) {
      const nextSegment = segments[i];
      
      if (nextSegment.speaker === currentSegment.speaker) {
        currentSegment.text += ' ' + nextSegment.text;
        currentSegment.endTime = nextSegment.endTime;
      } else {
        result.push(currentSegment);
        currentSegment = { ...nextSegment };
      }
    }
    
    result.push(currentSegment);
    
    return result;
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  // New method to fetch available tags
  const fetchAvailableTags = async () => {
    setIsLoadingTags(true);
    
    try {
      const response = await fetch('/api/tags', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.status}`);
      }
      
      const data = await response.json();
      setAvailableTags(data.tags || []);
    } catch (err) {
      console.error('Error fetching available tags:', err);
    } finally {
      setIsLoadingTags(false);
    }
  };
  
  // Load available tags on component mount
  useEffect(() => {
    fetchAvailableTags();
  }, []);
  
  // Create a new tag
  const handleCreateTag = async (tagName: string): Promise<Tag | null> => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: tagName }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create tag: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add the new tag to available tags
      setAvailableTags(prev => [...prev, data.tag]);
      
      return data.tag;
    } catch (err) {
      console.error('Error creating tag:', err);
      return null;
    }
  };
  
  // Add a tag to the current recording
  const handleAddTagToRecording = async (tagId: string) => {
    if (!currentRecordingId) return;
    
    setIsSavingTags(true);
    
    try {
      const response = await fetch(`/api/recordings/${currentRecordingId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tagIds: [tagId] }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add tag: ${response.status}`);
      }
      
      // Update the current recording tags list
      const tagToAdd = availableTags.find(tag => tag.id === tagId);
      if (tagToAdd) {
        setCurrentRecordingTags(prev => [...prev, tagToAdd]);
      }
      
      // Refresh available tags to keep the list up-to-date
      await fetchAvailableTags();
    } catch (err) {
      console.error('Error adding tag to recording:', err);
    } finally {
      setIsSavingTags(false);
    }
  };
  
  // Remove a tag from the current recording
  const handleRemoveTagFromRecording = async (tagId: string) => {
    if (!currentRecordingId) return;
    
    setIsSavingTags(true);
    
    try {
      const response = await fetch(`/api/recordings/${currentRecordingId}/tags?tagId=${tagId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to remove tag: ${response.status}`);
      }
      
      // Update the current recording tags list
      setCurrentRecordingTags(prev => prev.filter(tag => tag.id !== tagId));
      
      // Refresh available tags to keep the list up-to-date
      await fetchAvailableTags();
    } catch (err) {
      console.error('Error removing tag from recording:', err);
    } finally {
      setIsSavingTags(false);
    }
  };
  
  // Add a tag to a new recording before upload
  const handleAddTagToNewRecording = (tagId: string) => {
    const tagToAdd = availableTags.find(tag => tag.id === tagId);
    if (tagToAdd && !newRecordingTags.some(tag => tag.id === tagId)) {
      setNewRecordingTags(prev => [...prev, tagToAdd]);
    }
  };
  
  // Remove a tag from a new recording before upload
  const handleRemoveTagFromNewRecording = (tagId: string) => {
    setNewRecordingTags(prev => prev.filter(tag => tag.id !== tagId));
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out" style={{ marginRight: isDrawerOpen ? '350px' : '0' }}>
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
              Audio Meeting Notes
            </h1>

            <div className="space-y-10">
              <AudioUploader 
                onFileUpload={handleFileUpload} 
                isLoading={isTranscribing} 
                setUploadProgress={(progress) => {
                  setUploadProgress(progress);
                  if (progress > 0 && processStage === ProcessStage.Idle) {
                    setProcessStage(ProcessStage.Uploading);
                  }
                  if (progress === 100) {
                    setProcessStage(ProcessStage.Transcribing);
                  }
                }}
              />

              {file && !isTranscribing && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-white mb-2">
                    Add tags to this recording
                  </h3>
                  <TagSelector
                    selectedTags={newRecordingTags}
                    availableTags={availableTags}
                    onAddTag={handleAddTagToNewRecording}
                    onRemoveTag={handleRemoveTagFromNewRecording}
                    onCreateTag={handleCreateTag}
                    isLoading={isLoadingTags}
                    className="mb-4"
                  />
                </div>
              )}

              {processStage !== ProcessStage.Idle && (
                <ProcessStatus 
                  stage={processStage} 
                  uploadProgress={uploadProgress} 
                />
              )}

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

              {(isTranscribing || isLoadingRecording) && processStage === ProcessStage.Idle && (
                <div className="w-full max-w-2xl mx-auto text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">
                    {isTranscribing ? 'Transcribing your audio file...' : 'Loading recording...'}
                  </p>
                </div>
              )}

              {currentRecordingName && transcript.length > 0 && (
                <div className="w-full max-w-4xl mx-auto">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    {currentRecordingName}
                  </h2>
                  
                  {currentRecordingId && !isLoadingRecording && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-white mb-2">
                        Tags
                      </h3>
                      <TagSelector
                        selectedTags={currentRecordingTags}
                        availableTags={availableTags}
                        onAddTag={handleAddTagToRecording}
                        onRemoveTag={handleRemoveTagFromRecording}
                        onCreateTag={handleCreateTag}
                        isLoading={isLoadingTags || isSavingTags}
                      />
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
        </main>
        
        {user && (
          <>
            <DrawerToggleButton onClick={toggleDrawer} isDrawerOpen={isDrawerOpen} />
            
            <RecordingsDrawer 
              isOpen={isDrawerOpen}
              onClose={toggleDrawer}
              onSelectRecording={handleSelectRecording}
              selectedRecordingId={currentRecordingId}
            />
            
            {isDrawerOpen && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                onClick={toggleDrawer}
              ></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
