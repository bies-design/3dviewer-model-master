import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection("folders");

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');

    let query: any = {};
    if (parentId) {
      query.parentId = new ObjectId(parentId);
    } else {
      query.parentId = { $exists: false }; // Fetch top-level folders
    }

    const folders = await collection.find(query).sort({ createdAt: -1 }).toArray();

    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection("folders");

    const { name, parentId } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const newFolder: any = {
      name,
      createdAt: new Date(),
    };

    if (parentId) {
      newFolder.parentId = new ObjectId(parentId);
    }

    const result = await collection.insertOne(newFolder);

    return NextResponse.json({ ...newFolder, _id: result.insertedId });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}