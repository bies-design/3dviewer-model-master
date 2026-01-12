import { NextResponse, NextRequest } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { unsealData, sealData } from 'iron-session';
import { sessionOptions, SessionData } from '../../../../lib/session';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/authOptions'; // Import authOptions
import { User } from '@/types/mongodb';

export async function POST(request: NextRequest) {
    const nextAuthSession = await getServerSession(authOptions);

    const { username, email, password, avatar } = await request.json();
    const updateData: any = {};

    if (username) {
        updateData.username = username;
    }
    if (email) {
        updateData.email = email;
    }
    if (avatar) {
        updateData.avatar = avatar;
    }

    if (Object.keys(updateData).length === 0 && !password) {
        return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    try {
        const client = await clientPromise;
        const db = client.db("model-viewer");
        const collection = db.collection<User>("users");
        let currentUser: User | null = null;
        let queryFilter: any = {};

        if (nextAuthSession?.user?.email) {
            // NextAuth session exists, use email to find user
            queryFilter = { email: nextAuthSession.user.email };
            currentUser = await collection.findOne(queryFilter);
        } else {
            // Fallback to iron-session logic
            const cookieStore = await cookies();
            const cookie = cookieStore.get(sessionOptions.cookieName)?.value;

            if (!cookie) {
                return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
            }

            const ironSession: SessionData = await unsealData(cookie, { password: sessionOptions.password as string });

            if (!ironSession.isLoggedIn || !ironSession.user?._id) {
                return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
            }
            queryFilter = { _id: new ObjectId(ironSession.user._id) };
            currentUser = await collection.findOne(queryFilter);
        }

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Handle password update if provided
        if (password) {
            // For local users, check old password
            if (currentUser.password) {
                const isPasswordValid = await bcrypt.compare(password, currentUser.password);
                if (!isPasswordValid) {
                    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
                }
            } else {
                // For NextAuth users (e.g., Google), they don't have a local password
                // You might want to add logic here to allow setting a password for them
                // or disallow password changes for social logins.
                return NextResponse.json({ error: 'Password change not supported for social login users.' }, { status: 400 });
            }
            // If a new password is being set, hash it
            // updateData.password = await bcrypt.hash(newPassword, 10); // Assuming newPassword is also sent
        }

        await collection.updateOne(
            queryFilter,
            { $set: updateData }
        );

        const updatedUser = await collection.findOne(queryFilter);

        if (!updatedUser) {
            return NextResponse.json({ error: 'User not found after update' }, { status: 404 });
        }

        // If using iron-session, re-seal the session with updated user data
        if (!nextAuthSession?.user?.email) {
            const newSessionData = {
                isLoggedIn: true,
                user: {
                    _id: updatedUser._id.toString(),
                    username: updatedUser.username,
                    email: updatedUser.email,
                    avatar: updatedUser.avatar,
                    role: updatedUser.role
                },
            };
            const seal = await sealData(newSessionData, { password: sessionOptions.password as string });
            const response = NextResponse.json({ user: newSessionData.user });
            response.cookies.set(sessionOptions.cookieName, seal, sessionOptions.cookieOptions);
            return response;
        }

        // For NextAuth users, just return the updated user data
        return NextResponse.json({ user: { ...updatedUser, _id: updatedUser._id.toString() } });

    } catch (error) {
        console.error("Error updating user data:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
