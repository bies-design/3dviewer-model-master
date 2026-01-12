import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  try {
    const issueId = req.nextUrl.searchParams.get('issueId');

    if (!issueId) {
      return NextResponse.json({ message: 'Missing issueId query parameter.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('model-viewer');

    // Find all responses for the given issueId
    const responses = await db.collection('responses').find(
      { issueId: new ObjectId(issueId) },
      { projection: { _id: 1 } } // Only project _id
    ).toArray();

    const responseIds = responses.map(response => response._id);

    if (responseIds.length === 0) {
      return NextResponse.json([]); // No responses, so no history
    }

    const responseHistory = await db.collection('responseEdits').aggregate([
      { $match: { issueId: new ObjectId(issueId) } }, // Match by issueId directly
      { $sort: { timestamp: 1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          responseId: 1,
          userId: 1,
          timestamp: 1,
          changes: 1,
          action: 1, // Include action field
          oldText: '$changes.oldText', // Project oldText from changes
          oldImageUrl: '$changes.oldImageUrl', // Project oldImageUrl from changes
          user: '$user.username' // Project the username
        }
      }
    ]).toArray();

    return NextResponse.json(responseHistory);
  } catch (error) {
    console.error("Error fetching response history:", error);
    return NextResponse.json({ message: 'Error fetching response history.' }, { status: 500 });
  }
}
