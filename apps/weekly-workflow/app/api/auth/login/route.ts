import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUrl = getAuthorizationUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate login' },
      { status: 500 }
    );
  }
}
