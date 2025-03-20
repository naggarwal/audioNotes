# Audio Meeting Notes

A Next.js application that transcribes audio meeting files, identifies different speakers, and generates meeting notes.

## Features

- Upload audio files (MP3, WAV, M4A, AAC, OGG)
- Split large audio files into smaller segments for processing
- Transcribe audio with speaker identification
- Edit speaker names in the transcript
- Generate meeting notes with summary, key points, action items, and decisions

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- OpenAI API key

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up your environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Add your OpenAI API key to `.env.local`

```
OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

1. Upload an audio file of your meeting
   - For files larger than 25MB, you can use the built-in file splitting feature
   - The application will allow you to split the file into segments and process the first segment
2. Wait for the transcription to complete
3. Review the transcript with identified speakers
4. (Optional) Edit speaker names by clicking on them
5. Click "Generate Meeting Notes" to create a summary of the meeting
6. View the generated notes with summary, key points, action items, and decisions

## Handling Large Audio Files

The OpenAI API has a 25MB file size limit for audio transcription. This application provides several ways to handle larger files:

1. **File Splitting**: The application includes a built-in feature to split large audio files into smaller segments. When you upload a file larger than 25MB, you'll be given the option to split it into 2-5 segments and process the first segment.

2. **Manual Compression**: You can compress your audio file using external tools before uploading:
   - Use tools like ffmpeg: `ffmpeg -i input.mp3 -b:a 64k output.mp3`
   - Use online audio compression services

3. **Shorter Recordings**: For best results, keep your meeting recordings under 25MB or split longer meetings into separate recordings.

## Technical Details

- Built with Next.js and TypeScript
- Uses OpenAI's Whisper API for audio transcription
- Uses OpenAI's GPT-4 for meeting notes generation
- Styled with Tailwind CSS
- Uses React Dropzone for file uploads
- Uses Web Audio API for audio file processing and splitting

## Limitations

- The speaker identification is simulated for demonstration purposes. In a production environment, you would use a dedicated diarization service.
- The application has file size limits based on the OpenAI API constraints.
- When using the file splitting feature, only the first segment is processed. In a production app, you would process all segments and combine the results.
- Processing large audio files may take some time.

## License

MIT
