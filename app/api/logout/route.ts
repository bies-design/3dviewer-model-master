import { NextResponse } from 'next/server';
import { sessionOptions } from '../../../lib/session';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(sessionOptions.cookieName);
    return NextResponse.json({ message: 'Logout successful.' });
  } catch (e) {
    console.error('API POST Error (logout):', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Error logging out', details: errorMessage }, { status: 500 });
  }
}
