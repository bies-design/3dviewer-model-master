import { NextResponse } from 'next/server';
import { R2 } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function POST(request: Request) {
  const { r2FileName } = await request.json();

  if (!r2FileName) {
    return NextResponse.json({ error: 'File name is required' }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: r2FileName,
      ResponseContentDisposition: 'inline',
    });

    const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 }); // URL expires in 1 hour

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('Error generating signed URL for download:', error);
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
  }
}