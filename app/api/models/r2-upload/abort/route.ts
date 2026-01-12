import { NextResponse } from 'next/server';
import { R2 } from '../../../../../lib/r2';
import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3';

export async function POST(request: Request) {
  console.log('Abort request received:', request);
  const { fileName, uploadId } = await request.json();

  if (!fileName || !uploadId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileName,
      UploadId: uploadId,
    });
    await R2.send(command);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error aborting multipart upload:', error);
    return NextResponse.json({ error: 'Failed to abort multipart upload' }, { status: 500 });
  }
}
