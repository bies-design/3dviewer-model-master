import { NextResponse, NextRequest } from 'next/server';
import clientPromise from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest, context: any) {
  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection("large_model_files");

    const id = context.params.id;
    const { folderId } = await request.json();

    console.log('Backend: Received request to assign folder. Model ID:', id, 'Folder ID:', folderId);

    if (!id) {
      console.error('Backend: Model ID is required');
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    let updateDoc: any = {};
    if (folderId) {
      // Validate folderId if provided
      const folderCollection = db.collection("folders");
      const folderExists = await folderCollection.findOne({ _id: new ObjectId(folderId) });
      if (!folderExists) {
        console.error('Backend: Folder not found for ID:', folderId);
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
      updateDoc = { $set: { folderId: new ObjectId(folderId) } };
      console.log('Backend: Assigning folderId:', updateDoc.$set.folderId);
    } else {
      // If folderId is null or empty, remove the folderId field
      updateDoc = { $unset: { folderId: "" } };
      console.log('Backend: Unsetting folderId. updateDoc:', updateDoc);
    }

    console.log('Backend: Attempting to update model with ID:', id, 'Update document:', updateDoc);
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );
    console.log('Backend: Update result:', result);

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Model folder updated successfully' });
  } catch (error) {
    console.error('Error updating model folder:', error);
    return NextResponse.json({ error: 'Failed to update model folder' }, { status: 500 });
  }
}