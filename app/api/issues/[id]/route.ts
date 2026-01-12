import { NextResponse, NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { unsealData } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { Issue, IssueEdit } from '@/types/mongodb';

export async function PUT(request: NextRequest, context: any) {
  try {
    const issueId = context.params.id;
    const cookieStore = await cookies();
    const cookie = cookieStore.get(sessionOptions.cookieName)?.value;

    if (!cookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session: SessionData = await unsealData(cookie, { password: sessionOptions.password as string });

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const client = await clientPromise;
    const db = client.db('model-viewer');
    const issuesCollection = db.collection('issues');
    const historyCollection = db.collection('issues_edit_history');

    const originalIssue = await issuesCollection.findOne({ _id: new ObjectId(issueId) }) as Issue | null;

    if (!originalIssue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const updatedFields: { [key: string]: any } = {};
    const changes: any = {};

    for (const key in body) {
      if (key === '_id') continue;

      if (['elementId', 'authorId', 'assignedTo'].includes(key) && typeof body[key] === 'string') {
        try {
          const newObjectId = new ObjectId(body[key]);
          if (!newObjectId.equals((originalIssue as any)[key])) {
            changes[key] = {
              oldValue: (originalIssue as any)[key],
              newValue: newObjectId,
            };
            updatedFields[key] = newObjectId;
          }
        } catch (e) {
          if (body[key] !== (originalIssue as any)[key]) {
            changes[key] = {
              oldValue: (originalIssue as any)[key],
              newValue: body[key],
            };
            updatedFields[key] = body[key];
          }
        }
      } else if (key in originalIssue && body[key] !== (originalIssue as any)[key]) {
        changes[key] = {
          oldValue: (originalIssue as any)[key],
          newValue: body[key],
        };
        updatedFields[key] = body[key];
      }
    }

    if (Object.keys(changes).length > 0) {
      const newHistoryEntry: Omit<IssueEdit, '_id'> = {
        issueId: new ObjectId(issueId),
        userId: new ObjectId(session.user._id),
        timestamp: new Date(),
        changes,
      };
      await historyCollection.insertOne(newHistoryEntry as any);
    }

    if (Object.keys(updatedFields).length === 0) {
      return NextResponse.json({ message: 'No changes detected.' });
    }

    const updateResult = await issuesCollection.updateOne(
      { _id: new ObjectId(issueId) },
      { $set: updatedFields }
    );

    if (updateResult.modifiedCount === 0) {
        console.warn(`Issue ${issueId} was not modified despite detected changes.`);
    }

    return NextResponse.json({ success: true, ...updatedFields });

  } catch (error) {
    console.error(`Error updating issue ${context.params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    const issueId = context.params.id;
    const cookieStore = await cookies();
    const cookie = cookieStore.get(sessionOptions.cookieName)?.value;

    if (!cookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session: SessionData = await unsealData(cookie, { password: sessionOptions.password as string });

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('model-viewer');
    const issuesCollection = db.collection('issues');
    const responsesCollection = db.collection('responses');
    const historyCollection = db.collection('issues_edit_history');

    // Optional: Check if the user has permission to delete the issue
    // For example, only the author or an admin can delete it.
    // const issue = await issuesCollection.findOne({ _id: new ObjectId(issueId) });
    // if (issue.authorId.toString() !== session.user._id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // Soft delete the issue
    const updateResult = await issuesCollection.updateOne(
      { _id: new ObjectId(issueId) },
      { $set: { deleted: true } }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ error: 'Issue not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Issue soft-deleted successfully' });

  } catch (error) {
    console.error(`Error deleting issue ${context.params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
