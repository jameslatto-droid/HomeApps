import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserInfo } from '@/lib/auth';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/?error=missing_code', request.url));
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    
    if (!tokens.access_token) {
      return NextResponse.redirect(new URL('/?error=no_token', request.url));
    }

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);
    
    // Save to session
    const session = await getSession();
    session.userId = userInfo.email || '';
    session.email = userInfo.email || '';
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.isLoggedIn = true;
    await session.save();

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?error=callback_failed', request.url));
  }
}
