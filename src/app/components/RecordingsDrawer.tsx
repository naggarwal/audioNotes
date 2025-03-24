'use client';

import { useEffect, useState } from 'react';
import { formatDuration, formatDate, groupRecordingsByDateCategory } from '../../lib/utils';
import { Recording } from '../../lib/supabase';

interface RecordingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecording: (recordingId: string) => void;
  selectedRecordingId: string | null;
}

export default function RecordingsDrawer({ 
  isOpen, 
  onClose, 
  onSelectRecording,
  selectedRecordingId 
}: RecordingsDrawerProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      fetchRecordings();
    }
  }, [isOpen]);
  
  const fetchRecordings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/recordings');
      if (!response.ok) {
        throw new Error('Failed to fetch recordings');
      }
      
      const data = await response.json();
      setRecordings(data.recordings || []);
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError('Failed to load recordings');
    } finally {
      setIsLoading(false);
    }
  };
  
  const groupedRecordings = groupRecordingsByDateCategory(recordings);
  
  // Ordering for date categories
  const categoryOrder = ['Today', 'Yesterday', 'Last Week', 'Last Month', 'Older'];
  
  return (
    <div className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-72 bg-white dark:bg-gray-800 shadow-lg transition-transform duration-300 ease-in-out z-30 flex flex-col`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recordings</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-500 dark:text-red-400">
            {error}
          </div>
        ) : recordings.length === 0 ? (
          <div className="p-4 text-gray-500 dark:text-gray-400 text-center">
            No recordings found
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {categoryOrder.map(category => {
              const recordingsInCategory = groupedRecordings[category] || [];
              if (recordingsInCategory.length === 0) return null;
              
              return (
                <div key={category} className="py-2">
                  <h3 className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {category}
                  </h3>
                  <ul className="space-y-1">
                    {recordingsInCategory.map((recording: Recording) => (
                      <li 
                        key={recording.id}
                        className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                          selectedRecordingId === recording.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                        onClick={() => onSelectRecording(recording.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {recording.original_file_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatDate(recording.created_at)}
                            </p>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            {formatDuration(recording.duration_seconds)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 