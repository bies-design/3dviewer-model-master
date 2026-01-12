import { NextResponse } from 'next/server';
import { R2 } from '../../../../../lib/r2';
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3';

export async function POST(request: Request) {
  const { fileName } = await request.json();

  if (!fileName) {
    return NextResponse.json({ error: 'File name is required' }, { status: 400 });
  }
 
   try {
     const r2FileName = `models/${Date.now()}-${fileName}`;
     console.log('Starting multipart upload for:', { fileName, r2FileName });
     const command = new CreateMultipartUploadCommand({
       Bucket: process.env.R2_BUCKET_NAME!,
       Key: r2FileName,
     });
     const { UploadId } = await R2.send(command);
     console.log('Multipart upload started. UploadId:', UploadId);
 
     return NextResponse.json({ uploadId: UploadId, r2FileName: r2FileName });
   } catch (error) {
     console.error('Error starting multipart upload:', error);
     return NextResponse.json({ error: 'Failed to start multipart upload' }, { status: 500 });
   }
}
