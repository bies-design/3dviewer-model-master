import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { unsealData } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { R2 } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Response } from '@/types/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get('issueId');

    if (!issueId) {
      return NextResponse.json({ error: 'issueId is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('model-viewer');
    const responses = await db.collection('responses').aggregate([
      { $match: { issueId: new ObjectId(issueId) } },
      { $sort: { createdAt: 1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author'
        }
      },
      {
        $unwind: '$author'
      },
      {
        $project: {
          _id: 1,
          issueId: 1,
          text: 1,
          imageUrl: 1,
          createdAt: 1,
          authorId: 1,
          authorName: '$author.username'
        }
      }
    ]).toArray();

    return NextResponse.json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(sessionOptions.cookieName)?.value;

    if (!cookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session: SessionData = await unsealData(cookie, { password: sessionOptions.password as string });

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    const issueId = data.get('issueId') as string;
    const text = data.get('text') as string;

    if (!issueId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let imageUrl: string | undefined = undefined;

    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${file.name}`;
      const bucketName = process.env.R2_BUCKET_NAME;

      if (!bucketName) {
        throw new Error("R2_BUCKET_NAME is not set");
      }

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read',
      });

      await R2.send(command);
      
      const publicUrl = process.env.R2_PUBLIC_URL;
      if (!publicUrl) {
        throw new Error("R2_PUBLIC_URL is not set");
      }
      imageUrl = `${publicUrl}/${filename}`;
    }

    const client = await clientPromise;
    const db = client.db('model-viewer');

    const newResponse: Omit<Response, '_id'> = {
      issueId: new ObjectId(issueId),
      authorId: new ObjectId(session.user._id),
      authorName: session.user.username,
      text,
      imageUrl,
      createdAt: new Date(),
      updatedAt: new Date(), // Add updatedAt field
    };

    const result = await db.collection('responses').insertOne(newResponse);

    return NextResponse.json({ ...newResponse, _id: result.insertedId }, { status: 201 });

  } catch (error) {
    console.error('Error creating response:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
