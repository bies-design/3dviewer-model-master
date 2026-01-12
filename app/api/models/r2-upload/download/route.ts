import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { R2 } from '@/lib/r2';

export async function POST(request: NextRequest) {
  try {
    const { fileName } = await request.json();

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ message: 'File name is required and must be a string.' }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileName,
    });

    const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 }); // URL expires in 1 hour

    return NextResponse.json({ signedUrl });

  } catch (error) {
    console.error('Error creating signed URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to create signed URL', error: errorMessage }, { status: 500 });
  }
}
