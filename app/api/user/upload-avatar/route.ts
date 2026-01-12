import { NextResponse, NextRequest } from 'next/server';
import { R2 } from '@/lib/r2';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  // Temporarily skip authentication as per user request
  // const cookieStore = await cookies();
  // const session: IronSession<SessionData> = await getIronSession(cookieStore, sessionOptions);
  // const user = session.user;

  // if (!user || !user._id) {
  //   return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  // }

  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;
  const userId = data.get('userId') as string; // Assuming userId is passed from client for filename

  if (!file) {
    return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ success: false, message: 'User ID is required for avatar upload' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `avatars/${userId}-${Date.now()}-${file.name}`; // Unique filename for R2
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!bucketName) {
    return NextResponse.json({ success: false, message: 'R2 Bucket Name not configured' }, { status: 500 });
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    });

    await R2.send(command);

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${filename}`;

    const client = await clientPromise;
    const db = client.db("model-viewer");

    // Fetch current user to get old avatar URL
    let userObjectId;
    try {
      userObjectId = new ObjectId(userId);
    } catch (error) {
      console.error(`Invalid userId format: ${userId}`, error);
      return NextResponse.json({ success: false, message: 'Invalid user ID format.' }, { status: 400 });
    }
    const currentUser = await db.collection('users').findOne({ _id: userObjectId });
    const oldAvatarUrl = currentUser?.avatar;

    // Check if old avatar is a custom upload (not a default SVG) and delete it from R2
    if (oldAvatarUrl && process.env.R2_PUBLIC_URL && oldAvatarUrl.startsWith(process.env.R2_PUBLIC_URL)) {
      const oldFilename = oldAvatarUrl.replace(`${process.env.R2_PUBLIC_URL}/`, '');
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: oldFilename,
        });
        await R2.send(deleteCommand);
        console.log(`Old avatar ${oldFilename} deleted from R2.`);
      } catch (deleteError) {
        console.error(`Failed to delete old avatar ${oldFilename} from R2:`, deleteError);
        // Continue with new upload even if old avatar deletion fails
      }
    }

    // Update user's avatar in database with the new public URL
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { avatar: publicUrl } }
    );

    // Note: Session update is skipped as per user request to disable session
    // session.user.avatar = publicUrl;
    // await session.save();

    return NextResponse.json({ success: true, filePath: publicUrl });
  } catch (error) {
    console.error("Error uploading to R2:", error);
    return NextResponse.json({ success: false, message: 'Failed to upload avatar to R2' }, { status: 500 });
  }
}
