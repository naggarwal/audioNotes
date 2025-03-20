import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('API route called: /api/generate-notes');
    
    const body = await request.json();
    const { transcript, additionalInstructions } = body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
      console.log('Invalid transcript data');
      return NextResponse.json(
        { error: 'Invalid transcript data' },
        { status: 400 }
      );
    }

    console.log('Transcript received, length:', transcript.length);
    if (additionalInstructions) {
      console.log('Additional instructions received:', additionalInstructions);
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
    if (additionalInstructions && additionalInstructions.trim() !== '') {
      systemPrompt += `\n\nAdditional Instructions: ${additionalInstructions}`;
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
            content: `Here is the meeting transcript:\n\n${transcript}`
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