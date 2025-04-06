import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { saveMeetingNotesWithAuthClient } from '../../../lib/supabase-server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the shape of transcript segments
interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('API route called: /api/generate-notes');
    
    // Initialize Supabase client for authentication
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if user is authenticated
    if (!session) {
      console.log('User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Log session info for debugging
    console.log('Authentication check:', {
      isAuthenticated: true,
      userId: session.user.id
    });
    
    const body = await request.json();
    const { transcript, instructions, recordingId } = body;

    // Check if transcript is valid - now as array of objects
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      console.log('Invalid transcript data');
      return NextResponse.json(
        { error: 'Invalid transcript data' },
        { status: 400 }
      );
    }

    // Convert transcript segments to text format
    let transcriptText = '';
    transcript.forEach((segment: TranscriptSegment) => {
      const speakerPrefix = segment.speaker ? `${segment.speaker}: ` : '';
      transcriptText += `${speakerPrefix}${segment.text}\n\n`;
    });

    console.log('Transcript processed, length:', transcriptText.length);
    if (instructions) {
      console.log('Additional instructions received:', instructions);
    }

    // Prepare the system prompt with additional instructions if provided
    let systemPrompt = `You are an expert meeting assistant. Your task is to analyze meeting transcripts and generate concise, well-structured meeting notes. 
    Focus on extracting the most important information, including:
    1. A brief summary of the meeting (1-2 paragraphs)
    2. Key points discussed
    3. Action items (with assignees if mentioned)
    4. Decisions made
    
    Format your response as JSON with the following structure:
    {
      "summary": "Meeting summary here...",
      "keyPoints": ["Point 1", "Point 2", ...],
      "actionItems": ["Action 1", "Action 2", ...],
      "decisions": ["Decision 1", "Decision 2", ...]
    }
    
    Make sure your response is valid JSON.`;

    // Add additional instructions if provided
    if (instructions && instructions.trim() !== '') {
      systemPrompt += `\n\nAdditional Instructions: ${instructions}`;
    }

    // Generate meeting notes using OpenAI
    console.log('Calling OpenAI API for meeting notes generation using model:', process.env.OPENAI_MODEL || 'gpt-4');
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Here is the meeting transcript:\n\n${transcriptText}`
          }
        ],
        response_format: { type: 'json_object' },
      });

      const notesContent = completion.choices[0].message.content;
      
      if (!notesContent) {
        console.error('No content in OpenAI response');
        throw new Error('Failed to generate meeting notes');
      }

      console.log('Notes generated successfully');
      
      // Parse the JSON response
      const notes = JSON.parse(notesContent);
      
      // Save notes to the database if we have a recording ID
      if (recordingId) {
        const { data: savedNotes, error } = await saveMeetingNotesWithAuthClient(recordingId, notes);
        
        if (error) {
          console.error('Error saving meeting notes:', error);
          return NextResponse.json(
            { error: 'Failed to save meeting notes', details: error.message },
            { status: 500 }
          );
        }
        
        console.log('Notes saved to database successfully');
      } else {
        console.log('No recording ID provided, skipping database save');
      }

      return NextResponse.json(notes);
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      throw openaiError;
    }
  } catch (error) {
    console.error('Notes generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate meeting notes', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 