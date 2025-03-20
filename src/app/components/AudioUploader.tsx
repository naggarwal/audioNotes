'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

interface AudioUploaderProps {
  onFileUpload: (file: File, isLastSegment: boolean) => void;
  isLoading: boolean;
}

// Maximum file size allowed by OpenAI API (25MB in bytes)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Target segment size (20MB in bytes) - slightly below the max to be safe
const TARGET_SEGMENT_SIZE = 20 * 1024 * 1024;

export default function AudioUploader({ onFileUpload, isLoading }: AudioUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [showSplitOptions, setShowSplitOptions] = useState(false);
  const [segmentCount, setSegmentCount] = useState(2);
  const [optimalSegmentCount, setOptimalSegmentCount] = useState(2);
  const [processingFile, setProcessingFile] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [currentSegment, setCurrentSegment] = useState(1);
  const [totalSegments, setTotalSegments] = useState(0);
  const [waitingForTranscription, setWaitingForTranscription] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const largeFileRef = useRef<File | null>(null);
  const nextSegmentRef = useRef<number>(1);

  // Effect to process the next segment when transcription of the current segment is complete
  useEffect(() => {
    const processNextSegment = async () => {
      if (waitingForTranscription || !largeFileRef.current || nextSegmentRef.current > totalSegments) {
        return;
      }

      if (nextSegmentRef.current > 1 && nextSegmentRef.current <= totalSegments) {
        try {
          setProcessingFile(true);
          await processSegment(nextSegmentRef.current);
        } catch (error) {
          console.error(`Error processing segment ${nextSegmentRef.current}:`, error);
          setProcessingError(error instanceof Error ? error.message : `Failed to process segment ${nextSegmentRef.current}`);
          setProcessingFile(false);
        }
      }
    };

    if (!isLoading && nextSegmentRef.current <= totalSegments && nextSegmentRef.current > 1) {
      processNextSegment();
    }
  }, [isLoading, waitingForTranscription, totalSegments]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      // Reset previous errors and state
      setSizeError(null);
      setProcessingError(null);
      setCurrentSegment(1);
      setTotalSegments(0);
      nextSegmentRef.current = 1;
      
      console.log('File dropped:', {
        name: uploadedFile.name,
        type: uploadedFile.type,
        size: uploadedFile.size,
        sizeInMB: (uploadedFile.size / 1024 / 1024).toFixed(2) + ' MB'
      });
      
      // Check file size
      if (uploadedFile.size > MAX_FILE_SIZE) {
        console.log('File exceeds size limit:', {
          fileSize: uploadedFile.size,
          maxSize: MAX_FILE_SIZE,
          fileSizeInMB: (uploadedFile.size / 1024 / 1024).toFixed(2) + ' MB',
          maxSizeInMB: (MAX_FILE_SIZE / 1024 / 1024).toFixed(2) + ' MB'
        });
        
        // Calculate optimal number of segments to keep each under 20MB
        const optimal = Math.ceil(uploadedFile.size / TARGET_SEGMENT_SIZE);
        setOptimalSegmentCount(optimal);
        setSegmentCount(optimal);
        
        console.log('Calculated optimal segment count:', optimal);
        
        setSizeError(`File size (${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB) exceeds the 25MB limit.`);
        setShowSplitOptions(true);
        largeFileRef.current = uploadedFile;
        
        // Create object URL for audio preview
        if (audioRef.current) {
          const objectUrl = URL.createObjectURL(uploadedFile);
          audioRef.current.src = objectUrl;
        }
        return;
      }
      
      console.log('File is within size limit, proceeding with upload');
      setShowSplitOptions(false);
      setFile(uploadedFile);
      onFileUpload(uploadedFile, true); // Single file is always the last segment
    }
  }, [onFileUpload]);

  // Process all segments of the file
  const handleProcessAllSegments = async () => {
    if (!largeFileRef.current) {
      console.error('No file to split');
      return;
    }
    
    try {
      setProcessingFile(true);
      setProcessingError(null);
      setTotalSegments(segmentCount);
      setCurrentSegment(1);
      nextSegmentRef.current = 1;
      
      // Process the first segment
      await processSegment(1);
    } catch (error) {
      console.error('Error processing segments:', error);
      setProcessingError(error instanceof Error ? error.message : 'Failed to process audio file. Please try a smaller file.');
      setProcessingFile(false);
    }
  };
  
  // Process a specific segment of the file
  const processSegment = async (segmentIndex: number) => {
    if (!largeFileRef.current) {
      throw new Error('No file to process');
    }
    
    const originalFile = largeFileRef.current;
    const fileSize = originalFile.size;
    const segmentSize = Math.floor(fileSize / segmentCount);
    
    console.log(`Processing segment ${segmentIndex} of ${segmentCount}:`, {
      originalFileName: originalFile.name,
      originalFileSize: fileSize,
      originalFileSizeInMB: (fileSize / 1024 / 1024).toFixed(2) + ' MB',
      segmentCount,
      segmentSize,
      segmentSizeInMB: (segmentSize / 1024 / 1024).toFixed(2) + ' MB'
    });
    
    // Calculate start and end positions for this segment
    const startPos = (segmentIndex - 1) * segmentSize;
    const endPos = segmentIndex === segmentCount ? fileSize : segmentIndex * segmentSize;
    
    console.log(`Segment ${segmentIndex} range:`, {
      startPos,
      endPos,
      size: endPos - startPos,
      sizeInMB: ((endPos - startPos) / 1024 / 1024).toFixed(2) + ' MB'
    });
    
    // Create a slice for this segment
    const slice = originalFile.slice(startPos, endPos);
    
    // Create a new file with the slice
    const segmentFile = new File(
      [slice],
      `segment_${segmentIndex}_of_${segmentCount}_${originalFile.name}`,
      { type: originalFile.type }
    );
    
    console.log(`Created segment ${segmentIndex} file:`, {
      name: segmentFile.name,
      type: segmentFile.type,
      size: segmentFile.size,
      sizeInMB: (segmentFile.size / 1024 / 1024).toFixed(2) + ' MB'
    });
    
    // Check if the segment is still too large
    if (segmentFile.size > MAX_FILE_SIZE) {
      console.error(`Segment ${segmentIndex} still too large:`, {
        segmentSize: segmentFile.size,
        maxSize: MAX_FILE_SIZE,
        segmentSizeInMB: (segmentFile.size / 1024 / 1024).toFixed(2) + ' MB',
        maxSizeInMB: (MAX_FILE_SIZE / 1024 / 1024).toFixed(2) + ' MB'
      });
      
      throw new Error(`Segment ${segmentIndex} is still too large (${(segmentFile.size / 1024 / 1024).toFixed(2)} MB). Please try more segments or a smaller file.`);
    }
    
    console.log(`Segment ${segmentIndex} is within size limit, proceeding with upload`);
    setSizeError(null);
    setShowSplitOptions(false);
    setFile(segmentFile);
    setCurrentSegment(segmentIndex);
    
    // Set waiting flag before uploading
    setWaitingForTranscription(true);
    
    // Prepare for next segment
    nextSegmentRef.current = segmentIndex + 1;
    
    // Check if this is the last segment
    const isLastSegment = segmentIndex === segmentCount;
    
    // Upload this segment
    onFileUpload(segmentFile, isLastSegment);
  };

  // Called from parent when transcription is complete
  const onTranscriptionComplete = () => {
    setWaitingForTranscription(false);
    
    if (nextSegmentRef.current > totalSegments) {
      // All segments processed
      setProcessingFile(false);
    }
  };

  // Expose the onTranscriptionComplete method to parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).onTranscriptionComplete = onTranscriptionComplete;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).onTranscriptionComplete;
      }
    };
  }, []);

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
              {totalSegments > 0 && (
                <p className="text-xs text-blue-500 mt-1">
                  Processing segment {currentSegment} of {totalSegments}
                </p>
              )}
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
                Supports MP3, WAV, M4A, AAC, OGG (max 25MB)
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
      
      {(sizeError || processingError) && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
          <p>{processingError || sizeError}</p>
          
          {showSplitOptions && !processingError && (
            <div className="mt-4">
              <audio ref={audioRef} controls className="w-full mb-4" />
              
              <div className="mb-4">
                <label htmlFor="segmentCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Split into segments:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    id="segmentCount"
                    min="2"
                    max="20"
                    value={segmentCount}
                    onChange={(e) => setSegmentCount(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-sm">{segmentCount}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  We recommend using {optimalSegmentCount} segments to keep each segment under 20MB.
                </p>
              </div>
              
              <button
                onClick={handleProcessAllSegments}
                disabled={processingFile}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Process All Segments
              </button>
            </div>
          )}
          
          {processingError && (
            <div className="mt-2">
              <p className="text-sm font-medium">Alternative options:</p>
              <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                <li>Try using a smaller audio file (under 25MB)</li>
                <li>Try splitting into more segments</li>
                <li>Compress your audio file using an external tool</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
