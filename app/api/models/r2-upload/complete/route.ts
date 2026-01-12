import { NextResponse } from 'next/server';
import { R2 } from '../../../../../lib/r2';
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import clientPromise from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  const { fileName, uploadId, parts, r2FileName, groupIds } = await request.json();

  if (!fileName || !uploadId || !parts || !r2FileName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    console.log('Completing multipart upload in API:', { fileName, uploadId, r2FileName, partsCount: parts.length });
    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: r2FileName,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    });
    await R2.send(command);
    console.log('Multipart upload completed in R2.');

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection("large_model_files");
    const modelData: any = { name: fileName, r2FileName: r2FileName, uploadedAt: new Date(), groupIds: [] };

    // Find the "Main Group" ID
    const modelGroupsCollection = db.collection("model_groups");
    const mainGroup = await modelGroupsCollection.findOne({ name: "Main Group" });
    let mainGroupId: ObjectId | undefined;
    if (mainGroup) {
      mainGroupId = mainGroup._id;
    }

    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      modelData.groupIds = groupIds.map((id: string) => new ObjectId(id));
    } else if (mainGroupId) {
      modelData.groupIds = [mainGroupId];
    }

    const result = await collection.insertOne(modelData);
    console.log('Model metadata saved to MongoDB:', modelData);

    return NextResponse.json({ success: true, _id: result.insertedId });
  } catch (error) {
    console.error('Error completing multipart upload:', error);
    return NextResponse.json({ error: 'Failed to complete multipart upload' }, { status: 500 });
  }
}
