'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGoogleLogin, TokenResponse } from '@react-oauth/google';
import axios from 'axios';

// Google client ID from environment variable
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleDrivePickerProps {
  onFileSelected: (file: File, fileUrl: string) => void;
  disabled?: boolean;
}

export default function GoogleDrivePicker({ onFileSelected, disabled = false }: GoogleDrivePickerProps) {
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [isPickerApiLoaded, setIsPickerApiLoaded] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  // Load Google API Client Library
  useEffect(() => {
    const loadGoogleApis = () => {
      // Load the Google API Client Library
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = () => {
        window.gapi.load('picker', () => {
          setIsPickerApiLoaded(true);
        });
      };
      
      // Load the Google Identity Services script
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = true;
      gisScript.defer = true;
      gisScript.onload = () => {
        setIsGapiLoaded(true);
      };
      
      document.body.appendChild(gapiScript);
      document.body.appendChild(gisScript);
      
      return () => {
        document.body.removeChild(gapiScript);
        document.body.removeChild(gisScript);
      };
    };
    
    loadGoogleApis();
  }, []);

  // Handle Google Sign-in
  const login = useGoogleLogin({
    onSuccess: (tokenResponse: TokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      // If the user has already clicked the button, show the picker as soon as we have the token
      if (isPickerApiLoaded && isGapiLoaded) {
        showPicker(tokenResponse.access_token);
      }
    },
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
  });

  // Function to show the picker
  const showPicker = useCallback((token: string) => {
    // List of MIME types for audio files
    const audioMimeTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 
      'audio/x-wav', 'audio/aac', 'audio/m4a', 'audio/mp4', 
      'audio/x-m4a', 'audio/ogg'
    ];
    
    // Create a view that only shows audio files
    const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
    view.setMimeTypes(audioMimeTypes.join(','));
    
    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
      .setOAuthToken(token)
      .setAppId(CLIENT_ID || '')
      .addView(view)
      .setCallback(async (data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          setIsLoadingFile(true);
          try {
            const doc = data.docs[0];
            if (!doc) return;
            
            // Get the file content using the Google Drive API
            const response = await axios.get(
              `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
              {
                responseType: 'blob',
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            
            // Create a File object from the blob
            const fileName = doc.name;
            const fileExtension = fileName.split('.').pop()?.toLowerCase();
            
            // Map file extensions to MIME types
            const mimeTypeMap: Record<string, string> = {
              mp3: 'audio/mpeg',
              wav: 'audio/wav',
              m4a: 'audio/x-m4a',
              aac: 'audio/aac',
              ogg: 'audio/ogg',
              mp4: 'audio/mp4',
            };
            
            // Use the extension to determine MIME type, fallback to a generic audio type
            const mimeType = fileExtension && mimeTypeMap[fileExtension] 
              ? mimeTypeMap[fileExtension] 
              : 'audio/mpeg';
            
            const file = new File([response.data], fileName, { type: mimeType });
            
            // Create a temporary URL for the file
            const fileUrl = URL.createObjectURL(file);
            
            // Pass the file to the parent component
            onFileSelected(file, fileUrl);
          } catch (error) {
            console.error('Error downloading file from Google Drive:', error);
            alert('Failed to download the file from Google Drive.');
          } finally {
            setIsLoadingFile(false);
          }
        }
      })
      .build();
    
    picker.setVisible(true);
  }, [onFileSelected]);
  
  // Handle click on the Google Drive button
  const openPicker = useCallback(() => {
    if (!accessToken) {
      // Start OAuth flow if we don't have a token
      login();
    } else if (isPickerApiLoaded && isGapiLoaded) {
      // If we have a token and APIs are loaded, show the picker
      showPicker(accessToken);
    }
  }, [accessToken, isGapiLoaded, isPickerApiLoaded, login, showPicker]);

  return (
    <button
      onClick={openPicker}
      disabled={disabled || isLoadingFile}
      className={`flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${
        disabled || isLoadingFile ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {isLoadingFile ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      )}
      {isLoadingFile ? 'Downloading...' : 'Google Drive'}
    </button>
  );
} 