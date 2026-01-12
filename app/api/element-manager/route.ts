import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { R2 } from '@/lib/r2';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ObjectId } from 'mongodb';

// ==================== POST ====================
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '3dmodels';

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const originalFileName = formData.get('originalFileName') as string;

    if (!file || !originalFileName) {
      return NextResponse.json({ error: 'Missing file or original file name' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const body = Buffer.from(arrayBuffer);

    let r2FolderName: string;
    let collectionName: string;
    let isFragment = false;

    switch (category) {
      case 'drawings':
        r2FolderName = 'drawings/';
        collectionName = 'elementUploadsDrawings';
        break;
      case 'documents':
        r2FolderName = 'documents/';
        collectionName = 'elementUploadsDocuments';
        break;
      default:
        r2FolderName = 'fragments/';
        collectionName = 'elementUploads';
        isFragment = true;
        break;
    }

    const r2FileName = isFragment
      ? `${r2FolderName}${Date.now()}-${originalFileName.replace(/\.ifc$/, '.frag')}`
      : `${r2FolderName}${Date.now()}-${originalFileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: r2FileName,
      Body: body,
      ContentType: 'application/octet-stream',
    });

    await R2.send(command);

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection(collectionName);

    const result = await collection.insertOne({
      originalFileName,
      r2FileName,
      status: 'success',
      uploadedAt: new Date(),
    });

    return NextResponse.json({ success: true, insertedId: result.insertedId });

  } catch (error) {
    console.error('Error uploading element:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to upload element', details: errorMessage }, { status: 500 });
  }
}



// ==================== GET ====================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '3dmodels';

    let collectionName: string;
    switch (category) {
      case 'drawings':
        collectionName = 'elementUploadsDrawings';
        break;
      case 'documents':
        collectionName = 'elementUploadsDocuments';
        break;
      default:
        collectionName = 'elementUploads';
        break;
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection(collectionName);

    const history = await collection.find({}).sort({ uploadedAt: -1 }).toArray();

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching element upload history:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch history', details: errorMessage }, { status: 500 });
  }
}



// ==================== DELETE ====================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const r2FileName = searchParams.get('r2FileName');
    const category = searchParams.get('category') || '3dmodels';

    if (!id || !r2FileName) {
      return NextResponse.json({ error: 'Missing id or r2FileName' }, { status: 400 });
    }

    // Delete from R2
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: r2FileName,
    });
    await R2.send(deleteCommand);

    // Delete from MongoDB
    let collectionName: string;
    switch (category) {
      case 'drawings':
        collectionName = 'elementUploadsDrawings';
        break;
      case 'documents':
        collectionName = 'elementUploadsDocuments';
        break;
      default:
        collectionName = 'elementUploads';
        break;
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection(collectionName);

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Document not found in database' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Element deleted successfully' });

  } catch (error) {
    console.error('Error deleting element:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to delete element', details: errorMessage }, { status: 500 });
  }
}
