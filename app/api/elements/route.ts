import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const body = await request.json();

    if (body.queries) {
      // Handle search queries
      const { queries, modelIds, limit } = body;
      const mongoQuery = buildMongoQuery(queries, modelIds);
      const collection = db.collection("elements");
      
      let cursor = collection.find(mongoQuery);
      if (typeof limit === 'number' && limit > 0) {
        cursor = cursor.limit(limit);
      }
      
      const elements = await cursor.toArray();
      return NextResponse.json(elements);
    }

    // Handle element insertion/update
    const elements = body;
    if (!Array.isArray(elements) || elements.length === 0) {
      return NextResponse.json({ error: 'Invalid data format. Expected a non-empty array of elements.' }, { status: 400 });
    }

    const collection = db.collection("elements");
    
    const operations = elements.map(element => ({
      updateOne: {
        filter: { "attributes._localId.value": element.attributes._localId.value, modelId: element.modelId },
        update: { $set: element },
        upsert: true,
      },
    }));

    const result = await collection.bulkWrite(operations);

    return NextResponse.json({ message: `${result.upsertedCount} new elements inserted/updated successfully.` });
  } catch (e) {
    console.error('API POST Error (elements):', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Error saving/searching elements', details: errorMessage }, { status: 500 });
  }
}

function buildMongoQuery(queries: any[], modelIds: string[] = []) {
  const andConditions: any[] = [];
  const notConditions: any[] = [];

  if (modelIds.length > 0) {
    andConditions.push({ modelId: { $in: modelIds } });
  }

  queries.forEach(query => {
    const { attribute, operator, value, logic } = query;
    const field = attribute === 'Category' ? 'attributes._category.value' : `attributes.${attribute}.value`;
    let condition;

    switch (operator) {
      case 'equal':
        condition = { [field]: value };
        break;
      case 'include':
        condition = { [field]: { $regex: value, $options: 'i' } };
        break;
      case 'startsWith':
        condition = { [field]: { $regex: `^${value}`, $options: 'i' } };
        break;
      case 'endsWith':
        condition = { [field]: { $regex: `${value}$`, $options: 'i' } };
        break;
      default:
        condition = { [field]: { $regex: value, $options: 'i' } };
        break;
    }

    if (logic === 'NOT') {
      notConditions.push({ [field]: { $not: condition[field] } });
    } else {
      andConditions.push(condition);
    }
  });

  const mongoQuery: any = {};
  if (andConditions.length > 0) {
    mongoQuery.$and = andConditions;
  }
  if (notConditions.length > 0) {
    if (!mongoQuery.$and) mongoQuery.$and = [];
    mongoQuery.$and.push({ $nor: notConditions });
  }

  return mongoQuery;
}

export async function GET(request: Request) {
    try {
        const client = await clientPromise;
        const db = client.db("model-viewer");
        const { searchParams } = new URL(request.url);
        const expressID = searchParams.get('expressID');

        if (!expressID) {
            return NextResponse.json({ error: 'Missing expressID query parameter.' }, { status: 400 });
        }

        const collection = db.collection("elements");
        const element = await collection.findOne({ "attributes._localId.value": parseInt(expressID, 10) });

        if (!element) {
            return NextResponse.json({ error: 'Element not found.' }, { status: 404 });
        }

        return NextResponse.json(element);
    } catch (e) {
        console.error('API GET Error (elements):', e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Error fetching element', details: errorMessage }, { status: 500 });
    }
}
