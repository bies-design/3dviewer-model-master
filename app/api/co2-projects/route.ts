import { NextResponse } from 'next/server';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import clientPromise from '../../../lib/mongodb';
import { R2 } from '../../../lib/r2';

const requiredEnvVars = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection('co2Projects');
    const projects = await collection.find({}).sort({ createdAt: -1 }).toArray();

    const projectsWithUrls = await Promise.all(projects.map(async (project) => {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: project.coverImageR2Name,
      });
      const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 }); // URL expires in 1 hour

      const totalCO2 = project.materials.reduce((sum: number, material: any) => sum + material.co2eM2, 0);

      return {
        ...project,
        coverImageUrl: signedUrl,
        totalCO2: parseFloat(totalCO2.toFixed(2)),
      };
    }));

    return NextResponse.json(projectsWithUrls);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      console.error('API Error: Missing environment variables:', missingVars.join(', '));
      return NextResponse.json({ error: `Server configuration error: Missing environment variables: ${missingVars.join(', ')}` }, { status: 500 });
    }

    const formData = await request.formData();
    const modelName = formData.get('modelName') as string;
    const materials = formData.get('materials') as string;
    const coverImage = formData.get('coverImage') as File;
    const fragmentFile = formData.get('fragmentFile') as File;

    if (!modelName || !materials || !coverImage || !fragmentFile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection('co2Projects');

    const existingModel = await collection.findOne({ modelName });
    if (existingModel) {
      return NextResponse.json({ error: 'Model name already exists' }, { status: 409 });
    }

    const coverImageBuffer = Buffer.from(await coverImage.arrayBuffer());
    const coverImageName = `${Date.now()}-${coverImage.name}`;
    const putCoverImageCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: `co2-projects/images/${coverImageName}`,
      Body: coverImageBuffer,
      ContentType: coverImage.type,
    });
    await R2.send(putCoverImageCommand);

    const fragmentFileBuffer = Buffer.from(await fragmentFile.arrayBuffer());
    const fragmentFileName = `${Date.now()}-${modelName.replace(/\s+/g, '_')}.frag`;
    const putFragmentFileCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: `co2-projects/fragments/${fragmentFileName}`,
      Body: fragmentFileBuffer,
      ContentType: 'application/octet-stream',
    });
    await R2.send(putFragmentFileCommand);

    const parsedMaterials = JSON.parse(materials);

    const result = await collection.insertOne({
      modelName,
      coverImageR2Name: `co2-projects/images/${coverImageName}`,
      fragmentR2Name: `co2-projects/fragments/${fragmentFileName}`,
      materials: parsedMaterials,
      status: 'success',
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}