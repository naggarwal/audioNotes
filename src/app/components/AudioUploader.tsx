'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { upload } from '@vercel/blob/client';
import { createRecording } from '../../lib/supabase';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Dynamically import the GoogleDrivePicker to handle client-side only code
const GoogleDrivePicker = dynamic(() => import('./GoogleDrivePicker'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-800 h-9 w-32 rounded"></div>,
});

interface AudioUploaderProps {
  onFileUpload: (file: File, blobUrl?: string, recordingId?: string) => void;
  isLoading: boolean;
  setUploadProgress?: (progress: number) => void;
}

export default function AudioUploader({ onFileUpload, isLoading, setUploadProgress }: AudioUploaderProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [splittingFile, setSplittingFile] = useState(false);
  const [internalUploadProgress, setInternalUploadProgress] = useState(0);
  const [currentSegment, setCurrentSegment] = useState<number | null>(null);
  const [totalSegments, setTotalSegments] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState<string>('auto'); // Default to auto detection
  const [configError, setConfigError] = useState<string | null>(null);
  const [hasConfigBeenFetched, setHasConfigBeenFetched] = useState(false);
  const isLoadingConfigRef = useRef(false);

  // Add check for authentication
  useEffect(() => {
    if (!user) {
      window.location.href = '/login';
    }
  }, [user]);

  // Fetch the upload mode from the server on component mount
  useEffect(() => {
    // Skip if already fetched or currently loading
    if (hasConfigBeenFetched || isLoadingConfigRef.current) {
      return;
    }

    let isMounted = true;

    const fetchUploadMode = async () => {
      isLoadingConfigRef.current = true;
      setConfigError(null);

      try {
        console.log('Fetching configuration with credentials...');
        const response = await fetch('/api/get-config', {
          credentials: 'include',
          // Add cache control headers to prevent caching
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        // Check if component is still mounted
        if (!isMounted) return;
        
        console.log('Config response status:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Config data received:', data);
          
          // Extract uploadMode from the new config structure
          const configUploadMode = data.config?.uploadMode || 'blob';
          console.log('Setting upload mode to:', configUploadMode);
          setUploadMode(configUploadMode);
          setHasConfigBeenFetched(true);
        } else {
          console.error('Failed to fetch config:', response.status, response.statusText);
          setConfigError('Failed to fetch configuration');
          // Default to blob mode if config fetch fails
          setUploadMode('blob');
          setHasConfigBeenFetched(true);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to fetch upload mode configuration:', error);
        setConfigError('Failed to fetch configuration');
        // Default to blob mode if config fetch fails
        setUploadMode('blob');
        setHasConfigBeenFetched(true);
      } finally {
        if (isMounted) {
          isLoadingConfigRef.current = false;
        }
      }
    };

    fetchUploadMode();

    // Cleanup function to prevent memory leaks and state updates on unmounted component
    return () => {
      isMounted = false;
      isLoadingConfigRef.current = false;
    };
  }, [hasConfigBeenFetched]); // Only depend on hasConfigBeenFetched

  // Reset the file state when processing is completed
  useEffect(() => {
    if (!isLoading && processingFile) {
      // When loading is finished, reset the states
      setProcessingFile(false);
      setFile(null);
      setInternalUploadProgress(0);
    }
  }, [isLoading, processingFile]);

  // Update parent component with upload progress
  useEffect(() => {
    if (setUploadProgress) {
      setUploadProgress(internalUploadProgress);
    }
  }, [internalUploadProgress, setUploadProgress]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      // Reset previous state
      setErrorMessage(null);
      setInternalUploadProgress(0);
      
      console.log('File dropped:', {
        name: uploadedFile.name,
        type: uploadedFile.type,
        size: uploadedFile.size,
        sizeInMB: (uploadedFile.size / 1024 / 1024).toFixed(2) + ' MB',
        uploadMode
      });
      
      // Set file
      setFile(uploadedFile);
      setProcessingFile(true);
      
      try {
        // Decide whether to use Blob upload or direct upload based on config and file size
        const shouldUseBlobUpload = 
          uploadMode === 'blob' || 
          (uploadMode === 'auto' && uploadedFile.size > 4 * 1024 * 1024);
        
        if (shouldUseBlobUpload) {
          console.log('Using Vercel Blob upload (mode:', uploadMode, ')');
          
          // Start upload with progress tracking
          setInternalUploadProgress(0);
          
          // Create a unique filename to avoid collisions
          const fileName = `${Date.now()}-${uploadedFile.name}`;
          
          const blobUpload = await upload(fileName, uploadedFile, {
            access: 'public',
            handleUploadUrl: '/api/audio-upload',
            // Add user context in the payload as a JSON string
            clientPayload: JSON.stringify({
              userId: user?.id,
              originalFileName: uploadedFile.name,
              fileFormat: fileName.split('.').pop()?.toLowerCase() || '',
              mimeType: uploadedFile.type
            }),
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setInternalUploadProgress(progress);
            },
          });
          
          setInternalUploadProgress(100);
          console.log('File uploaded to Blob:', blobUpload.url);
          
          // Variable to store the recording ID if created
          let recordingId: string | undefined;
          
          // Create a recording entry manually for development environments
          if (window.location.hostname === 'localhost') {
            try {
              console.log('Creating recording entry manually for local development');
              const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
              
              // Ensure we have a user before proceeding
              if (!user?.id) {
                throw new Error('Authentication required');
              }
              
              // Map extensions to MIME types
              const mimeTypes: Record<string, string> = {
                mp3: 'audio/mpeg',
                wav: 'audio/wav',
                m4a: 'audio/x-m4a',
                aac: 'audio/aac',
                ogg: 'audio/ogg',
                mp4: 'audio/mp4',
              };
              
              const supabase = createClientComponentClient();
              
              const result = await supabase
                .from('recordings')
                .insert({
                  file_name: blobUpload.pathname,
                  original_file_name: fileName,
                  file_size_bytes: uploadedFile.size,
                  duration_seconds: null,
                  file_format: fileExtension,
                  mime_type: uploadedFile.type || mimeTypes[fileExtension] || null,
                  storage_path: blobUpload.url,
                  user_id: user.id, // Always require user_id
                  transcription_status: 'pending',
                  metadata: {
                    uploadedAt: new Date().toISOString(),
                    blobId: null,
                    uploadedFromLocalDev: true
                  },
                })
                .select()
                .single();
              
              if (result.data) {
                recordingId = result.data.id;
                console.log('Recording entry created successfully for local development with ID:', recordingId);
              } else if (result.error) {
                console.error('Error creating recording entry:', result.error);
                throw result.error;
              }
            } catch (error) {
              console.error('Error creating recording entry for local development:', error);
              setErrorMessage(error instanceof Error ? error.message : 'Authentication required');
              setProcessingFile(false);
              return;
            }
          }
          
          // Now process the file from the Blob URL
          onFileUpload(uploadedFile, blobUpload.url, recordingId);
        } else {
          // For direct upload mode or smaller files in auto mode
          console.log('Using direct upload (mode:', uploadMode, ')');
          onFileUpload(uploadedFile);
        }
      } catch (error) {
        console.error('Error processing file:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to process audio file');
        setProcessingFile(false);
      }
    }
  }, [onFileUpload, uploadMode, user]);

  // Handle file selected from Google Drive
  const handleGoogleDriveFileSelected = useCallback(async (selectedFile: File, fileUrl: string) => {
    // Reset previous state
    setErrorMessage(null);
    setInternalUploadProgress(0);
    
    console.log('File selected from Google Drive:', {
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size,
      sizeInMB: (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB',
      uploadMode
    });
    
    // Set file
    setFile(selectedFile);
    setProcessingFile(true);
    
    try {
      // Process like a regular upload
      // Decide whether to use Blob upload or direct upload based on config and file size
      const shouldUseBlobUpload = 
        uploadMode === 'blob' || 
        (uploadMode === 'auto' && selectedFile.size > 4 * 1024 * 1024);
      
      if (shouldUseBlobUpload) {
        console.log('Using Vercel Blob upload for Google Drive file (mode:', uploadMode, ')');
        
        // Start upload with progress tracking
        setInternalUploadProgress(0);
        
        // Create a unique filename to avoid collisions
        const fileName = `${Date.now()}-${selectedFile.name}`;
        
        const blobUpload = await upload(fileName, selectedFile, {
          access: 'public',
          handleUploadUrl: '/api/audio-upload',
          // Add user context in the payload as a JSON string
          clientPayload: JSON.stringify({
            userId: user?.id,
            originalFileName: selectedFile.name,
            fileFormat: fileName.split('.').pop()?.toLowerCase() || '',
            mimeType: selectedFile.type
          }),
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setInternalUploadProgress(progress);
          },
        });
        
        setInternalUploadProgress(100);
        console.log('Google Drive file uploaded to Blob:', blobUpload.url);
        
        // Variable to store the recording ID if created
        let recordingId: string | undefined;
        
        // Create a recording entry manually for development environments
        if (window.location.hostname === 'localhost') {
          try {
            console.log('Creating recording entry manually for local development (Google Drive file)');
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
            
            // Map extensions to MIME types
            const mimeTypes: Record<string, string> = {
              mp3: 'audio/mpeg',
              wav: 'audio/wav',
              m4a: 'audio/x-m4a',
              aac: 'audio/aac',
              ogg: 'audio/ogg',
              mp4: 'audio/mp4',
            };
            
            // Create an authenticated client
            const supabase = createClientComponentClient();
            
            const result = await supabase
              .from('recordings')
              .insert({
                file_name: blobUpload.pathname,
                original_file_name: fileName,
                file_size_bytes: selectedFile.size,
                duration_seconds: null,
                file_format: fileExtension,
                mime_type: selectedFile.type || mimeTypes[fileExtension] || null,
                storage_path: blobUpload.url,
                user_id: user?.id || null,
                transcription_status: 'pending',
                metadata: {
                  uploadedAt: new Date().toISOString(),
                  blobId: null,
                  uploadedFromLocalDev: true,
                  source: 'google_drive'
                },
              })
              .select()
              .single();
            
            if (result.data) {
              recordingId = result.data.id;
              console.log('Recording entry created successfully for local development with ID:', recordingId);
            } else if (result.error) {
              console.error('Error creating recording entry:', result.error);
              throw result.error;
            }
          } catch (error) {
            console.error('Error creating recording entry for local development:', error);
          }
        }
        
        // Now process the file from the Blob URL
        onFileUpload(selectedFile, blobUpload.url, recordingId);
      } else {
        // For direct upload mode or smaller files in auto mode
        console.log('Using direct upload for Google Drive file (mode:', uploadMode, ')');
        onFileUpload(selectedFile);
      }
    } catch (error) {
      console.error('Error processing Google Drive file:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process audio file from Google Drive');
      setProcessingFile(false);
    }
  }, [onFileUpload, uploadMode, user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.mp4']
    },
    maxFiles: 1,
    disabled: isLoading || processingFile
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!user ? (
        <div className="text-center p-4">
          <p className="text-red-600 dark:text-red-400">Please log in to upload files</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'
          } ${(isLoading || processingFile) ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            {file ? (
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {isDragActive ? 'Drop the audio file here' : 'Drag & drop an audio file here'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  or click to select a file
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Supports MP3, WAV, M4A, MP4, AAC, OGG files up to 250MB
                </p>
              </div>
            )}
            {(isLoading || processingFile) && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-sm text-gray-500">
                  {isLoading ? 'Transcribing...' : 
                   internalUploadProgress > 0 ? `Uploading: ${internalUploadProgress}%` : 
                   splittingFile ? 'Splitting audio file...' : 'Processing audio file...'}
                </p>
                {currentSegment !== null && totalSegments !== null && !splittingFile && (
                  <p className="mt-1 text-xs text-gray-500">
                    Processing segment {currentSegment} of {totalSegments}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Google Drive picker button */}
      <div className="mt-4 flex justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Or select audio from</p>
          <GoogleDrivePicker 
            onFileSelected={handleGoogleDriveFileSelected}
            disabled={isLoading || processingFile}
          />
        </div>
      </div>
      
      {errorMessage && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
          <p>{errorMessage}</p>
          
          <div className="mt-2">
            <p className="text-sm font-medium">Alternative options:</p>
            <ul className="list-disc list-inside text-xs mt-1 space-y-1">
              <li>Try a different audio file format</li>
              <li>Check that your audio file isn't corrupted</li>
              <li>Try a file with clearer audio</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
