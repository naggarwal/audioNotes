'use client';

interface MeetingNotesProps {
  notes: {
    summary: string;
    keyPoints: string[];
    actionItems: string[];
    decisions: string[];
  } | null;
}

export default function MeetingNotes({ notes }: MeetingNotesProps) {
  if (!notes) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Meeting Notes</h2>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Summary</h3>
          <p className="text-gray-700 dark:text-gray-300">{notes.summary}</p>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Key Points</h3>
          <ul className="list-disc pl-5 space-y-1">
            {notes.keyPoints.map((point, index) => (
              <li key={index} className="text-gray-700 dark:text-gray-300">{point}</li>
            ))}
          </ul>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Action Items</h3>
          <ul className="list-disc pl-5 space-y-1">
            {notes.actionItems.map((item, index) => (
              <li key={index} className="text-gray-700 dark:text-gray-300">{item}</li>
            ))}
          </ul>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Decisions</h3>
          <ul className="list-disc pl-5 space-y-1">
            {notes.decisions.map((decision, index) => (
              <li key={index} className="text-gray-700 dark:text-gray-300">{decision}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 