import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { GridFSBucket } from 'mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const bucket = new GridFSBucket(db, { bucketName: 'models' });

    const filename = 'default-model.frag';
    const downloadStream = bucket.openDownloadStreamByName(filename);

    // Since we are in a Next.js API route, we can leverage ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        let isClosed = false;

        const onData = (chunk: Buffer) => {
          if (!isClosed) {
            controller.enqueue(chunk);
          }
        };

        const onEnd = () => {
          cleanup();
          if (!isClosed) {
            isClosed = true;
            controller.close();
          }
        };

        const onError = (err: Error) => {
          cleanup();
          console.error('GridFS stream error:', err);
          if (!isClosed) {
            isClosed = true;
            controller.error(err);
          }
        };

        const cleanup = () => {
          downloadStream.removeListener('data', onData);
          downloadStream.removeListener('end', onEnd);
          downloadStream.removeListener('error', onError);
        };

        downloadStream.on('data', onData);
        downloadStream.on('end', onEnd);
        downloadStream.on('error', onError);
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });

  } catch (e) {
    console.error('API GET Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Error fetching model from GridFS', details: errorMessage }, { status: 500 });
  }
}

// The POST endpoint is no longer needed for the final workflow,
// but we can leave it here for now. It won't be used.
export async function POST(request: Request) {
  return NextResponse.json({ message: 'This endpoint is not actively used.' });
}