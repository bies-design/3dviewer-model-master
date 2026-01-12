import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const MONGODB_URI = process.env.MONGODB_URI as string;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID as string;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID as string;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY as string;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME as string;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { modelId, r2FileName } = await req.json();
    console.log('Delete API received:', { modelId, r2FileName });

    if (!modelId || !r2FileName) {
      console.error('Missing modelId or r2FileName in delete request');
      return NextResponse.json({ error: 'Missing modelId or r2FileName' }, { status: 400 });
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('model-viewer');
    const collection = db.collection('large_model_files');

    // Delete from MongoDB
    const deleteResult = await collection.deleteOne({ _id: new ObjectId(modelId), r2FileName });
    console.log('MongoDB delete result:', deleteResult);

    if (deleteResult.deletedCount === 0) {
      await client.close();
      console.error(`Model not found in database for _id: ${modelId}, r2FileName: ${r2FileName}`);
      return NextResponse.json({ error: 'Model not found in database' }, { status: 404 });
    }

    // Delete from R2
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2FileName,
    });
    await s3Client.send(deleteCommand);

    await client.close();
    return NextResponse.json({ message: 'Model deleted successfully from MongoDB and R2' });
  } catch (error) {
    console.error('Error deleting model:', error);
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
  }
}