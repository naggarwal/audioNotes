# AudioNotes Setup Guide

To run this application, you need to:

1. Create a `.env.local` file in the project root with the following content:
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

# Use Deepgram for transcription (recommended)
USE_DEEPGRAM=true

# Google Drive integration (optional)
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
```

2. Replace the placeholder values with your actual API keys:
   - Get an OpenAI API key from: https://platform.openai.com/
   - Get a Deepgram API key from: https://console.deepgram.com/
   - For Vercel Blob storage:
     - Go to your Vercel project
     - Select the Storage tab
     - Click "Connect Database"
     - Select "Blob" and click "Continue"
     - Name your store "AudioFiles" and click "Create"
     - Copy the Read & Write token

3. Run the development server with:
```
npm run dev
```

4. Access the application at: http://localhost:3000 