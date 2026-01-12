import { NextResponse } from 'next/server';
import { unsealData } from 'iron-session';
import { sessionOptions, SessionData } from '../../../lib/session';
import { cookies } from 'next/headers';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { User } from '@/types/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/authOptions'; // Import authOptions

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (session?.user?.email) {
        // NextAuth session exists, fetch user from MongoDB using email
        try {
            const client = await clientPromise;
            const db = client.db("model-viewer");
            const usersCollection = db.collection<User>("users");
            const userFromDb = await usersCollection.findOne({ email: session.user.email });

            if (userFromDb) {
                const userToSend = {
                    ...userFromDb,
                    _id: userFromDb._id.toString(),
                    role: userFromDb.role || 'user' // Ensure role is always present
                };
                return NextResponse.json({ user: userToSend });
            } else {
                // This case should ideally not happen if NextAuth is correctly creating users in DB
                return NextResponse.json({ error: 'User not found in DB despite NextAuth session' }, { status: 404 });
            }
        } catch (error) {
            console.error("Error fetching user data from MongoDB with NextAuth session:", error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
    } else {
        // No NextAuth session, fallback to iron-session logic
        const cookieStore = await cookies();
        const cookie = cookieStore.get(sessionOptions.cookieName)?.value;

        if (!cookie) {
            return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
        }

        try {
            const ironSession: SessionData = await unsealData(cookie, { password: sessionOptions.password as string });

            if (!ironSession.isLoggedIn || !ironSession.user?.email) {
                return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
            }

            const client = await clientPromise;
            const db = client.db("model-viewer");
            const usersCollection = db.collection<User>("users");

            const userFromDb = await usersCollection.findOne({ email: ironSession.user.email });

            if (userFromDb) {
                return NextResponse.json({ user: userFromDb });
            } else {
                // Ensure _id is string and role is present even if user is from ironSession directly
                const userToSend = {
                    ...ironSession.user,
                    _id: ironSession.user._id ? ironSession.user._id.toString() : '', // Ensure _id is string
                    role: ironSession.user.role || 'user' // Ensure role is always present
                };
                return NextResponse.json({ user: userToSend });
            }
        } catch (error) {
            console.error("Error fetching user data with iron-session:", error);
            return NextResponse.json({ error: 'Invalid session or database error' }, { status: 401 });
        }
    }
}
