import { NextResponse } from 'next/server';
import { R2 } from '../../../../../lib/r2';
import { ListPartsCommand } from '@aws-sdk/client-s3';

export async function POST(request: Request) {
  const { fileName, uploadId } = await request.json();

  if (!fileName || !uploadId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const command = new ListPartsCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileName,
      UploadId: uploadId,
    });
    const { Parts } = await R2.send(command);

    return NextResponse.json({ parts: Parts || [] });
  } catch (error) {
    console.error('Error listing parts:', error);
    return NextResponse.json({ error: 'Failed to list parts' }, { status: 500 });
  }
}
