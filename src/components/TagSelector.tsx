'use client';

import { useState, useEffect, useRef } from 'react';
import { Tag } from '@/lib/supabase';

interface TagSelectorProps {
  selectedTags: Tag[];
  availableTags: Tag[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag: (tagName: string) => Promise<Tag | null>;
  isLoading?: boolean;
  className?: string;
}

export default function TagSelector({
  selectedTags,
  availableTags,
  onAddTag,
  onRemoveTag,
  onCreateTag,
  isLoading = false,
  className = ''
}: TagSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter available tags based on input value and exclude already selected tags
  useEffect(() => {
    if (inputValue.trim() === '') {
      // Show all available tags that aren't already selected
      setFilteredTags(
        availableTags.filter(tag => 
          !selectedTags.some(selectedTag => selectedTag.id === tag.id)
        )
      );
    } else {
      // Filter tags by name match and exclude selected ones
      setFilteredTags(
        availableTags.filter(tag => 
          tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
          !selectedTags.some(selectedTag => selectedTag.id === tag.id)
        )
      );
    }
  }, [inputValue, availableTags, selectedTags]);
  
  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle tag creation
  const handleCreateTag = async () => {
    if (inputValue.trim() === '') return;
    
    setIsCreatingTag(true);
    try {
      const newTag = await onCreateTag(inputValue.trim());
      if (newTag) {
        onAddTag(newTag.id);
        setInputValue('');
      }
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Handle tag selection from dropdown
  const handleSelectTag = (tagId: string) => {
    onAddTag(tagId);
    setInputValue('');
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If there's a filtered tag that matches exactly, select it
      const exactMatch = filteredTags.find(
        tag => tag.name.toLowerCase() === inputValue.toLowerCase()
      );
      
      if (exactMatch) {
        handleSelectTag(exactMatch.id);
      } else if (inputValue.trim() !== '') {
        // Otherwise create a new tag
        handleCreateTag();
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="mb-2 flex flex-wrap gap-2">
        {selectedTags.map(tag => (
          <span 
            key={tag.id}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
          >
            {tag.name}
            <button
              type="button"
              className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-200 text-blue-500 dark:bg-blue-800 dark:text-blue-300 hover:bg-blue-300 dark:hover:bg-blue-700 focus:outline-none"
              onClick={() => onRemoveTag(tag.id)}
              disabled={isLoading}
            >
              <span className="sr-only">Remove tag {tag.name}</span>
              <svg className="h-2 w-2" fill="none" stroke="currentColor" viewBox="0 0 8 8">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M1 1l6 6M1 7l6-6" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      
      <div className="relative" ref={dropdownRef}>
        <input
          ref={inputRef}
          type="text"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Add tags..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (e.target.value.trim() !== '') {
              setIsDropdownOpen(true);
            }
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyPress={handleKeyPress}
          disabled={isLoading || isCreatingTag}
        />
        
        {isCreatingTag && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        
        {isDropdownOpen && filteredTags.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg max-h-60 overflow-auto">
            <ul className="py-1">
              {filteredTags.map(tag => (
                <li
                  key={tag.id}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSelectTag(tag.id)}
                >
                  {tag.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {isDropdownOpen && filteredTags.length === 0 && inputValue.trim() !== '' && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg">
            <div className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={handleCreateTag}>
              Create tag "{inputValue}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 