import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { unsealData } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { Issue } from '@/types/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const elementId = searchParams.get('elementId');

    if (!elementId) {
      return NextResponse.json({ error: 'elementId is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('model-viewer');
    const issues = await db.collection<Issue>('issues').find({ elementId: new ObjectId(elementId) }).toArray();

    return NextResponse.json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(sessionOptions.cookieName)?.value;

    if (!cookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session: SessionData = await unsealData(cookie, { password: sessionOptions.password as string });

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { elementId, modelId, title, description, status, priority, type, labels, assignedTo, dueDate } = body;

    if (!elementId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('model-viewer');

    const newIssue: Omit<Issue, '_id'> = {
      elementId: new ObjectId(elementId),
      modelId: modelId, // modelId should be a string based on Issue interface
      authorId: new ObjectId(session.user._id),
      title,
      description,
      status: status || 'Open',
      priority: priority || 'Normal',
      type: type || 'Issue',
      labels: labels || [],
      assignedTo: assignedTo ? new ObjectId(assignedTo) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdAt: new Date(),
    };

    const result = await db.collection('issues').insertOne(newIssue);

    return NextResponse.json({ ...newIssue, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
