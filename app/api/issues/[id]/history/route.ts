import { NextResponse, NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { IssueEdit } from '@/types/mongodb';

export async function GET(request: NextRequest, context: any): Promise<NextResponse> {
  try {
    const issueId = context.params.id;

    if (!issueId) {
      return NextResponse.json({ error: 'issueId is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('model-viewer');

    const history = await db
      .collection<IssueEdit>('issues_edit_history')
      .aggregate([
        { $match: { issueId: new ObjectId(issueId) } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'authorInfo',
          },
        },
        { $unwind: { path: '$authorInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            issueId: 1,
            userId: 1,
            timestamp: 1,
            changes: 1,
            'authorInfo.username': 1,
          },
        },
        { $sort: { timestamp: -1 } },
      ])
      .toArray();

    return NextResponse.json(history);
  } catch (error) {
    console.error(`Error fetching history for issue ${context.params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
