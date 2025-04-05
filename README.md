# AudioNotes

A Next.js application that transcribes audio meeting files, identifies different speakers, and generates meeting notes.

## Features

- Upload and process audio files
- Transcribe audio with speaker identification using Deepgram
- Generate meeting notes from transcriptions using OpenAI
- View and download results
- Support for large file uploads via Vercel Blob
- Configurable upload modes (direct, blob, or auto)

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- Vercel account (for Vercel Blob storage)

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a Blob store in the Vercel dashboard:
   - Go to your Vercel project
   - Select the Storage tab
   - Click "Connect Database"
   - Select "Blob" and click "Continue"
   - Name your store "AudioFiles" and click "Create"
4. Create a `.env.local` file with the following:
   ```
   # OpenAI API Key (for meeting notes generation)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Deepgram API Key (for transcription with speaker diarization)
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   
   # OpenAI model to use for notes generation
   OPENAI_MODEL=gpt-4o
   
   # Vercel Blob token (from your Vercel dashboard)
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
   
   # Upload mode: direct, blob, or auto
   UPLOAD_MODE=auto
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Transcription Options

This application supports two transcription services:

1. **Deepgram** (default) - Provides transcription with speaker diarization, capable of handling files up to 250MB with excellent accuracy
2. **OpenAI Whisper** - Alternative option with 25MB file size limitation

## Environment Configuration

- Set `USE_DEEPGRAM=true` in your `.env.local` file to use Deepgram for transcription (recommended)
- Set `USE_DEEPGRAM=false` to use OpenAI Whisper instead
- Set `BLOB_READ_WRITE_TOKEN` to your Vercel Blob token for handling large file uploads
- Configure `UPLOAD_MODE` to control how files are handled:
  - `direct`: Always use direct server upload (not recommended for Vercel deployment with large files)
  - `blob`: Always use Vercel Blob storage (requires BLOB_READ_WRITE_TOKEN)
  - `auto`: Automatically use direct uploads for files under 4MB and Blob for larger files (default)

## How to Use

1. Upload an audio file of your meeting
2. Depending on your UPLOAD_MODE setting and file size, it will be uploaded directly or via Vercel Blob
3. Wait for the transcription to complete
4. Review the transcript with identified speakers
5. (Optional) Edit speaker names by clicking on them
6. Click "Generate Meeting Notes" to create a summary of the meeting
7. View the generated notes with summary, key points, action items, and decisions

## Technical Details

- Built with Next.js and TypeScript
- Uses Deepgram for audio transcription with speaker diarization
- Uses OpenAI's GPT-4 for meeting notes generation
- Uses Vercel Blob for large file uploads (bypassing Vercel's 4.5MB API limit)
- Styled with Tailwind CSS
- Uses React Dropzone for file uploads

## Deployment on Vercel

When deploying to Vercel, make sure to:

1. Create a Blob store in your Vercel project's Storage tab
2. Add the `BLOB_READ_WRITE_TOKEN` to your project's Environment Variables
3. Set up all other environment variables (API keys, etc.)
4. Set `UPLOAD_MODE=auto` or `UPLOAD_MODE=blob` to handle large files properly (Vercel has a 4.5MB API limit)

## Limitations

- The application may have file size limits based on the API constraints.
- Processing large audio files may take some time.

## Google Drive Integration

This application supports uploading audio files directly from Google Drive. To enable this feature:

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google Drive API for your project
3. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Set up the OAuth consent screen if prompted
   - Select "Web application" as the application type
   - Add your domain to the "Authorized JavaScript origins" (e.g., `http://localhost:3000` for development)
   - Add your redirect URI (e.g., `http://localhost:3000` for development)
4. Copy the Client ID and add it to your `.env.local` file:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
   ```

If you're developing locally, you must add yourself as a test user in the OAuth consent screen section.

## License

MIT
