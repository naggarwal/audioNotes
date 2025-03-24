/**
 * Format seconds to a human-readable time format (MM:SS)
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || isNaN(seconds)) {
    return '--:--';
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Categorize a date into relative groups
 */
export function getDateCategory(date: string | Date): string {
  const recordingDate = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  // Reset time part for correct date comparison
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const recordingDateOnly = new Date(recordingDate.getFullYear(), recordingDate.getMonth(), recordingDate.getDate());
  
  // Calculate days difference
  const diffTime = todayDate.getTime() - recordingDateOnly.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (recordingDateOnly.getTime() === todayDate.getTime()) {
    return 'Today';
  } else if (recordingDateOnly.getTime() === yesterdayDate.getTime()) {
    return 'Yesterday';
  } else if (diffDays <= 7) {
    return 'Last Week';
  } else if (diffDays <= 30) {
    return 'Last Month';
  } else {
    return 'Older';
  }
}

/**
 * Format a date for display
 */
export function formatDate(date: string | Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  };
  return new Date(date).toLocaleDateString(undefined, options);
}

/**
 * Group recordings by date category
 */
export function groupRecordingsByDateCategory(recordings: any[]) {
  const groups: Record<string, any[]> = {
    'Today': [],
    'Yesterday': [],
    'Last Week': [],
    'Last Month': [],
    'Older': []
  };
  
  recordings.forEach(recording => {
    const category = getDateCategory(recording.created_at);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(recording);
  });
  
  return groups;
} 