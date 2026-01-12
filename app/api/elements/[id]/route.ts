import { NextResponse, NextRequest } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest, context: any) {
  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const id = context.params.id;

    let query;
    if (ObjectId.isValid(id)) {
      query = { "_id": new ObjectId(id) };
    } else if (!isNaN(parseInt(id, 10))) {
      query = { "expressID": parseInt(id, 10) };
    } else {
      return NextResponse.json({ error: 'Invalid element ID format.' }, { status: 400 });
    }

    const collection = db.collection("elements");
    const element = await collection.findOne(query);

    if (!element) {
      return NextResponse.json({ error: 'Element not found.' }, { status: 404 });
    }

    return NextResponse.json(element);
  } catch (e) {
    console.error('API GET Error (element by id):', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Error fetching element', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: any) {
  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const { id } = context.params;
    const { attributes, history } = await request.json();

    if (!attributes && !history) {
      return NextResponse.json({ error: 'No attributes or history provided for update.' }, { status: 400 });
    }

    let query;
    if (ObjectId.isValid(id)) {
      query = { "_id": new ObjectId(id) };
    } else if (!isNaN(parseInt(id, 10))) {
      query = { "expressID": parseInt(id, 10) };
    } else {
      return NextResponse.json({ error: 'Invalid element ID format.' }, { status: 400 });
    }

    const collection = db.collection("elements");
    
    const updateData: any = {};
    if (attributes) {
      updateData.$set = { attributes };
    }
    if (history) {
      updateData.$push = { history: { $each: [history], $position: 0 } };
    }

    const result = await collection.updateOne(query, updateData);

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Element not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Element updated successfully', result });
  } catch (e) {
    console.error('API PUT Error (element by id):', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Error updating element', details: errorMessage }, { status: 500 });
  }
}
