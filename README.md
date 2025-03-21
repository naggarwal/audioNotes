# AudioNotes

A Next.js application that transcribes audio meeting files, identifies different speakers, and generates meeting notes.

## Features

- Upload and process audio files
- Transcribe audio with speaker identification using Deepgram
- Generate meeting notes from transcriptions using OpenAI
- View and download results

## Prerequisites

- Node.js 18.x or later
- npm or yarn

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env.local` file with the following:
   ```
   # OpenAI API Key (for meeting notes generation)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Deepgram API Key (for transcription with speaker diarization)
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   
   # OpenAI model to use for notes generation
   OPENAI_MODEL=gpt-4o
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Transcription Options

This application supports two transcription services:

1. **Deepgram** (default) - Provides transcription with speaker diarization, capable of handling files up to 250MB with excellent accuracy
2. **OpenAI Whisper** - Alternative option with 25MB file size limitation

## Environment Configuration

- Set `USE_DEEPGRAM=true` in your `.env.local` file to use Deepgram for transcription (recommended)
- Set `USE_DEEPGRAM=false` to use OpenAI Whisper instead

## How to Use

1. Upload an audio file of your meeting
2. Wait for the transcription to complete
3. Review the transcript with identified speakers
4. (Optional) Edit speaker names by clicking on them
5. Click "Generate Meeting Notes" to create a summary of the meeting
6. View the generated notes with summary, key points, action items, and decisions

## Technical Details

- Built with Next.js and TypeScript
- Uses Deepgram for audio transcription with speaker diarization
- Uses OpenAI's GPT-4 for meeting notes generation
- Styled with Tailwind CSS
- Uses React Dropzone for file uploads

## Limitations

- The application may have file size limits based on the API constraints.
- Processing large audio files may take some time.

## License

MIT
