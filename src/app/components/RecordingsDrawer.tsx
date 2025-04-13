'use client';

import { useEffect, useState } from 'react';
import { formatDuration, formatDate, groupRecordingsByDateCategory } from '../../lib/utils';
import { Recording, Tag } from '../../lib/supabase';

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
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      fetchRecordings();
      fetchTags();
    }
  }, [isOpen]);
  
  useEffect(() => {
    // Refetch recordings when selected tags change
    if (isOpen && selectedTagIds.length > 0) {
      fetchRecordings();
    }
  }, [selectedTagIds, isOpen]);
  
  const fetchRecordings = async () => {
    setIsLoading(true);
    setError(null);
    
    console.log('Fetching recordings with credentials included...');
    
    try {
      // Build the URL with tag filtering if needed
      let url = '/api/recordings';
      if (selectedTagIds.length > 0) {
        url += `?tags=${selectedTagIds.join(',')}`;
      }
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`Failed to fetch recordings: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Recordings data received:', data);
      setRecordings(data.recordings || []);
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError('Failed to load recordings');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchTags = async () => {
    setIsLoadingTags(true);
    
    try {
      const response = await fetch('/api/tags', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setAvailableTags(data.tags || []);
    } catch (err) {
      console.error('Error fetching tags:', err);
    } finally {
      setIsLoadingTags(false);
    }
  };
  
  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };
  
  const handleClearTagFilters = () => {
    setSelectedTagIds([]);
    // Don't call fetchRecordings here, as useEffect will handle it
    // Instead, directly fetch without filter tags
    setIsLoading(true);
    setError(null);
    
    fetch('/api/recordings', {
      credentials: 'include'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch recordings: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        setRecordings(data.recordings || []);
      })
      .catch(err => {
        console.error('Error fetching recordings:', err);
        setError('Failed to load recordings');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  const groupedRecordings = groupRecordingsByDateCategory(recordings);
  
  // Ordering for date categories
  const categoryOrder = ['Today', 'Yesterday', 'Last Week', 'Last Month', 'Older'];

  // Get recording tags helper function
  const getRecordingTags = (recordingId: string): Tag[] => {
    // In a real implementation, the recording entity would include its tags
    // This is a placeholder until we update the backend to include tags with recordings
    return [];
  };
  
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
      
      {/* Tag filters */}
      {availableTags.length > 0 && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by tags</h3>
            {selectedTagIds.length > 0 && (
              <button
                onClick={handleClearTagFilters}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleToggleTag(tag.id)}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                  selectedTagIds.includes(tag.id) 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
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
            {selectedTagIds.length > 0 
              ? 'No recordings match the selected tags' 
              : 'No recordings found'}
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
                    {recordingsInCategory.map((recording: Recording) => {
                      const recordingTags = getRecordingTags(recording.id);
                      
                      return (
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
                              
                              {/* Display recording tags */}
                              {recordingTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {recordingTags.map(tag => (
                                    <span
                                      key={tag.id}
                                      className="inline-block px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs"
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              {formatDuration(recording.duration_seconds)}
                            </div>
                          </div>
                        </li>
                      );
                    })}
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