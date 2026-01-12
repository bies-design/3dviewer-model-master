import { NextResponse } from 'next/server';
import { R2 } from '../../../../../lib/r2';
import { UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function POST(request: Request) {
  const { fileName, uploadId, partNumber } = await request.json();

  if (!fileName || !uploadId || !partNumber) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const command = new UploadPartCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileName,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('Error generating presigned URL for part:', error);
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }
}
