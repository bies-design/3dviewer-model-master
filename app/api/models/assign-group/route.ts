import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const { modelId, groupIds } = await req.json();

    if (!modelId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const modelsCollection = db.collection("large_model_files");

    const updateDoc: { $set: { groupIds: ObjectId[] } } = {
      $set: {
        groupIds: groupIds && groupIds.length > 0 ? groupIds.map((id: string) => new ObjectId(id)) : [],
      },
    };

    const result = await modelsCollection.updateOne(
      { _id: new ObjectId(modelId) },
      updateDoc
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Model group updated successfully' });
  } catch (error) {
    console.error('Error assigning model to group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}