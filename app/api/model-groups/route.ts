import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const modelGroupsCollection = db.collection("model_groups");

    const result = await modelGroupsCollection.insertOne({ name, createdAt: new Date() });

    return NextResponse.json({ message: 'Model group created successfully', groupId: result.insertedId });
  } catch (error) {
    console.error('Error creating model group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const modelGroupsCollection = db.collection("model_groups");

    const groups = await modelGroupsCollection.find({}).toArray();

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching model groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}