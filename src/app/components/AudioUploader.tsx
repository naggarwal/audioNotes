'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

interface AudioUploaderProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export default function AudioUploader({ onFileUpload, isLoading }: AudioUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingFile, setProcessingFile] = useState(false);

  // Reset the file state when processing is completed
  useEffect(() => {
    if (!isLoading && processingFile) {
      // When loading is finished, reset the states
      setProcessingFile(false);
      setFile(null);
    }
  }, [isLoading, processingFile]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      // Reset previous state
      setErrorMessage(null);
      
      console.log('File dropped:', {
        name: uploadedFile.name,
        type: uploadedFile.type,
        size: uploadedFile.size,
        sizeInMB: (uploadedFile.size / 1024 / 1024).toFixed(2) + ' MB'
      });
      
      // Set file and upload
      setFile(uploadedFile);
      
      // Upload directly without any splitting
      try {
        setProcessingFile(true);
        onFileUpload(uploadedFile);
      } catch (error) {
        console.error('Error processing file:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to process audio file');
        setProcessingFile(false);
      }
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg']
    },
    maxFiles: 1,
    disabled: isLoading || processingFile
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
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
                Supports MP3, WAV, M4A, AAC, OGG files up to 250MB
              </p>
            </div>
          )}
          {(isLoading || processingFile) && (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-sm text-gray-500">
                {isLoading ? 'Transcribing...' : 'Processing audio file...'}
              </p>
            </div>
          )}
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
