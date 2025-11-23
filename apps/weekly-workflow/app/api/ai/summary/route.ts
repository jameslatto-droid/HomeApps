import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { GoogleSheetsService } from '@/lib/google-sheets';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sheetsService = new GoogleSheetsService(session.accessToken);
    const entries = await sheetsService.getCurrentWeekEntries();

    if (entries.length === 0) {
      return NextResponse.json({
        summary: 'No governance entries recorded for this week yet.',
      });
    }

    // Format entries for AI
    const formattedEntries = entries.map(entry => ({
      type: entry.type,
      title: entry.title,
      description: entry.description,
      status: entry.status,
    }));

    const prompt = `You are a governance analyst. Provide a concise weekly summary of the following governance entries:

${JSON.stringify(formattedEntries, null, 2)}

Summarize:
1. Key decisions made
2. Major risks identified
3. Important datasets tracked
4. Financial items

Keep the summary professional, concise, and actionable. Use bullet points.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful governance analyst that creates concise weekly summaries.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary.';

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
