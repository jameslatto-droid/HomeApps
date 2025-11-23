import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { GoogleSheetsService } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    const sheetsService = new GoogleSheetsService(session.accessToken);
    await sheetsService.addEntry(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving entry:', error);
    return NextResponse.json(
      { error: 'Failed to save entry' },
      { status: 500 }
    );
  }
}
