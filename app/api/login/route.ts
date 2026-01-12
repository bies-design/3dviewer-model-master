import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import { sealData } from 'iron-session';
import { sessionOptions } from '../../../lib/session';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection("users");

    const user = await collection.findOne({ username });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const sessionData = {
      isLoggedIn: true,
      user: {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role || 'user', // Include role, default to 'user'
        avatar: user.avatar || undefined, // Include avatar if present
      },
    };

    const seal = await sealData(sessionData, { password: sessionOptions.password as string });

    const response = NextResponse.json({ message: 'Login successful.', user: sessionData.user });
    response.cookies.set(sessionOptions.cookieName, seal, sessionOptions.cookieOptions);

    return response;
  } catch (e) {
    console.error('API POST Error (login):', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Error logging in', details: errorMessage }, { status: 500 });
  }
}
