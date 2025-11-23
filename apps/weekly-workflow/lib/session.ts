import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId?: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  isLoggedIn: boolean;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'governance-app-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
