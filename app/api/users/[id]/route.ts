import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request: Request, context: any) {
  try {
    const { id } = context.params;
    const { role } = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!role || (role !== 'admin' && role !== 'user')) {
      return NextResponse.json({ error: 'Invalid role provided' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: { role: role } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
  }
}