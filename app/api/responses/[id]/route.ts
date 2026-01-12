import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { unsealData } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function PUT(request: NextRequest, context: any) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(sessionOptions.cookieName)?.value;

  if (!cookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session: SessionData = await unsealData(cookie, { password: sessionOptions.password as string });

  if (!session.isLoggedIn || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = context.params;
  const { text } = await request.json();

  if (!text) {
    return NextResponse.json({ message: 'Response text is required.' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('model-viewer');

    const existingResponse = await db.collection('responses').findOne({ _id: new ObjectId(id) });

    if (!existingResponse) {
      return NextResponse.json({ message: 'Response not found.' }, { status: 404 });
    }

    if (existingResponse.authorId.toString() !== session.user._id) {
      return NextResponse.json({ message: 'You are not authorized to edit this response.' }, { status: 403 });
    }

    const oldText = existingResponse.text;
    const newUpdatedAt = new Date();

    await db.collection('responses').updateOne(
      { _id: new ObjectId(id) },
      { $set: { text, updatedAt: newUpdatedAt } }
    );

    // Record history
    await db.collection('responseEdits').insertOne({
      issueId: existingResponse.issueId, // Add issueId here
      responseId: new ObjectId(id),
      userId: new ObjectId(session.user._id),
      changes: {
        text: { oldValue: oldText, newValue: text },
      },
      timestamp: new Date(),
    });

    return NextResponse.json({ message: 'Response updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error("Error updating response:", error);
    return NextResponse.json({ message: 'Error updating response.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: any) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(sessionOptions.cookieName)?.value;

  if (!cookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session: SessionData = await unsealData(cookie, { password: sessionOptions.password as string });

  if (!session.isLoggedIn || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = context.params;

  try {
    const client = await clientPromise;
    const db = client.db('model-viewer');

    const existingResponse = await db.collection('responses').findOne({ _id: new ObjectId(id) });

    if (!existingResponse) {
      return NextResponse.json({ message: 'Response not found.' }, { status: 404 });
    }

    if (existingResponse.authorId.toString() !== session.user._id) {
      return NextResponse.json({ message: 'You are not authorized to delete this response.' }, { status: 403 });
    }

    // Record deletion in history before deleting the response
    await db.collection('responseEdits').insertOne({
      issueId: existingResponse.issueId,
      responseId: new ObjectId(id),
      action: 'deleted',
      userId: new ObjectId(session.user._id),
      timestamp: new Date(),
      changes: {
        oldText: existingResponse.text || null,
        oldImageUrl: existingResponse.imageUrl || null,
      },
    });

    await db.collection('responses').deleteOne({ _id: new ObjectId(id) });
    // Do not delete associated history records, as we just added one for deletion.
    // await db.collection('responseEdits').deleteMany({ responseId: new ObjectId(id) });

    return NextResponse.json({ message: 'Response deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error("Error deleting response:", error);
    return NextResponse.json({ message: 'Error deleting response.' }, { status: 500 });
  }
}