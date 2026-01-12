import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { username, password, email } = await request.json();
    if (!username || !password || !email) {
      return NextResponse.json({ error: 'Username, password and email are required.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection("users");

    const existingUser = await collection.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this username or email already exists.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const now = new Date();
    await collection.insertOne({
      username,
      email,
      password: hashedPassword,
      role: 'user', // Default role for new users
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ message: 'User registered successfully.' });
  } catch (e) {
    console.error('API POST Error (register):', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Error registering user', details: errorMessage }, { status: 500 });
  }
}
