import { NextResponse, NextRequest } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest, context: any) {
  const id = context.params.id;
  const { name } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection("folders");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}