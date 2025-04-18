'use client';

import { useState } from 'react';
import CopyButton from './CopyButton';

interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
}

interface TranscriptDisplayProps {
  transcript: TranscriptSegment[];
  isGeneratingNotes: boolean;
  onGenerateNotes: (additionalInstructions: string) => void;
}

export default function TranscriptDisplay({ 
  transcript, 
  isGeneratingNotes, 
  onGenerateNotes 
}: TranscriptDisplayProps) {
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Generate the full transcript text for copying
  const fullTranscriptText = transcript.map(segment => {
    const timeStamp = formatTime(segment.startTime);
    const speakerText = segment.speaker ? `${segment.speaker}: ` : '';
    return `[${timeStamp}] ${speakerText}${segment.text}`;
  }).join('\n\n');

  if (transcript.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Transcript</h2>
          <CopyButton textToCopy={fullTranscriptText} tooltipText="Transcript" />
        </div>
        
        <div className="w-full">
          <label htmlFor="additionalInstructions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Additional Instructions
          </label>
          <textarea
            id="additionalInstructions"
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            placeholder="Add any specific instructions for generating meeting notes..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            rows={3}
          />
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={() => onGenerateNotes(additionalInstructions)}
            disabled={isGeneratingNotes}
            className={`px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors ${
              isGeneratingNotes ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isGeneratingNotes ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Notes...
              </span>
            ) : (
              'Generate Meeting Notes from Transcript'
            )}
          </button>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {transcript.map((segment, index) => (
          <div key={index} className="flex gap-4">
            <div className="w-16 flex-shrink-0">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(segment.startTime)}
              </div>
            </div>
            <div className="flex-1">
              {segment.speaker && (
                <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                  {segment.speaker}
                </div>
              )}
              <p className="text-gray-800 dark:text-gray-200">{segment.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 