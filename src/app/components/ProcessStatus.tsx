'use client';

import { useEffect } from 'react';

export enum ProcessStage {
  Idle = 'idle',
  Uploading = 'uploading',
  Transcribing = 'transcribing',
  Completed = 'completed'
}

interface ProcessStatusProps {
  stage: ProcessStage;
  uploadProgress: number;
}

export default function ProcessStatus({ stage, uploadProgress }: ProcessStatusProps) {
  // Determine which steps are complete, current, or pending
  const stagesOrder = [ProcessStage.Uploading, ProcessStage.Transcribing, ProcessStage.Completed];
  const currentStageIndex = stagesOrder.indexOf(stage);
  
  // Skip the idle stage in display
  if (stage === ProcessStage.Idle) {
    return null;
  }
  
  return (
    <div className="w-full max-w-2xl mx-auto my-6 px-4">
      <div className="relative">
        {/* Progress Bar Background */}
        <div className="overflow-hidden h-2 mb-6 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
          {/* Progress Bar - Width based on current step */}
          <div 
            style={{ 
              width: stage === ProcessStage.Uploading 
                ? `${uploadProgress}%` 
                : stage === ProcessStage.Transcribing 
                  ? '66%' 
                  : '100%' 
            }} 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
          ></div>
        </div>
        
        {/* Steps */}
        <div className="flex justify-between">
          {/* Step 1: Uploading */}
          <div className="text-center">
            <div className={`
              w-8 h-8 mx-auto rounded-full flex items-center justify-center
              ${stage === ProcessStage.Uploading 
                ? 'bg-blue-500 text-white' 
                : currentStageIndex > stagesOrder.indexOf(ProcessStage.Uploading) 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}
            `}>
              {currentStageIndex > stagesOrder.indexOf(ProcessStage.Uploading) ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            <div className="text-xs mt-2 font-medium text-gray-900 dark:text-gray-100">
              {stage === ProcessStage.Uploading ? (
                <span>Uploading ({uploadProgress}%)</span>
              ) : (
                <span>Upload</span>
              )}
            </div>
          </div>
          
          {/* Step 2: Transcribing */}
          <div className="text-center">
            <div className={`
              w-8 h-8 mx-auto rounded-full flex items-center justify-center
              ${stage === ProcessStage.Transcribing 
                ? 'bg-blue-500 text-white' 
                : currentStageIndex > stagesOrder.indexOf(ProcessStage.Transcribing) 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}
            `}>
              {currentStageIndex > stagesOrder.indexOf(ProcessStage.Transcribing) ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </div>
            <div className="text-xs mt-2 font-medium text-gray-900 dark:text-gray-100">Transcribing</div>
          </div>
          
          {/* Step 3: Completed */}
          <div className="text-center">
            <div className={`
              w-8 h-8 mx-auto rounded-full flex items-center justify-center
              ${stage === ProcessStage.Completed 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}
            `}>
              {stage === ProcessStage.Completed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="text-xs mt-2 font-medium text-gray-900 dark:text-gray-100">Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
} 