import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(req: NextRequest, context: any) {
  try {
    const { id } = context.params;
    const { name } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const modelGroupsCollection = db.collection("model_groups");

    const result = await modelGroupsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Model group not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Model group updated successfully' });
  } catch (error) {
    console.error('Error updating model group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: any) {
  try {
    const { id } = context.params;

    if (!id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const modelGroupsCollection = db.collection("model_groups");
    const modelsCollection = db.collection("models");

    // First, unset the groupId from any models associated with this group
    await modelsCollection.updateMany(
      { groupId: new ObjectId(id) },
      { $unset: { groupId: "" } }
    );

    const result = await modelGroupsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Model group not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Model group deleted successfully' });
  } catch (error) {
    console.error('Error deleting model group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}