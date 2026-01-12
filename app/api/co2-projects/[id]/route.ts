import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest, context: any) {
  const { params } = context;
  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection("co2Projects");

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const project = await collection.findOne({ _id: new ObjectId(params.id) });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    const { materials, modelName, _id, fragmentR2Name, history } = project;

    return NextResponse.json({ materials, modelName, _id, fragmentR2Name, history: history || [] });
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: any) {
  const { params } = context;
  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection("co2Projects");

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const { materials, history } = await request.json();

    const result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: { materials },
        $push: { history: history },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Project updated successfully" });
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}