import { NextResponse } from 'next/server';
import clientPromise from '../../../../../lib/mongodb';

export async function POST(request: Request) {
  const { fileName } = await request.json();

  if (!fileName) {
    return NextResponse.json({ error: 'File name is required' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection("large_model_files");

    const existingFile = await collection.findOne({ name: fileName });

    return NextResponse.json({ exists: !!existingFile, model: existingFile });
  } catch (error) {
    console.error('Error checking file existence:', error);
    return NextResponse.json({ error: 'Failed to check file existence' }, { status: 500 });
  }
}
