import { NextResponse } from 'next/server';
import { R2 } from '../../../../lib/r2';
import { ListObjectsV2Command, DeleteObjectsCommand, ListMultipartUploadsCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import clientPromise from '../../../../lib/mongodb';

export async function POST() {
  const bucketName = process.env.R2_BUCKET_NAME!;
  try {
    // 1. Abort all ongoing multipart uploads
    const listMultipartUploadsCommand = new ListMultipartUploadsCommand({ Bucket: bucketName });
    const multipartUploads = await R2.send(listMultipartUploadsCommand);

    if (multipartUploads.Uploads && multipartUploads.Uploads.length > 0) {
      for (const upload of multipartUploads.Uploads) {
        const abortCommand = new AbortMultipartUploadCommand({
          Bucket: bucketName,
          Key: upload.Key!,
          UploadId: upload.UploadId!,
        });
        await R2.send(abortCommand);
      }
    }

    // 2. Delete all completed objects
    const listObjectsCommand = new ListObjectsV2Command({ Bucket: bucketName });
    const listedObjects = await R2.send(listObjectsCommand);

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      return NextResponse.json({ success: true, message: 'No objects to delete.' });
    }

    const deleteParams = {
      Bucket: bucketName,
      Delete: {
        Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
      },
    };

    const deleteObjectsCommand = new DeleteObjectsCommand(deleteParams);
    await R2.send(deleteObjectsCommand);

    // 3. Clear the large_model_files collection in MongoDB
    const client = await clientPromise;
    const db = client.db("model-viewer");
    await db.collection("large_model_files").deleteMany({});

    return NextResponse.json({ success: true, message: 'All large models and ongoing uploads cleared successfully from R2 and MongoDB.' });
  } catch (error) {
    console.error('Failed to clear large models from R2:', error);
    return NextResponse.json({ success: false, error: 'Failed to clear large models from R2' });
  }
}
