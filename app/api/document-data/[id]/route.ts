import { NextResponse, NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { R2 } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(request: NextRequest, context: any) {
  try {
    const id = context.params.id;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid ID provided" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const objectId = new ObjectId(id);

    const drawingsCollection = db.collection("elementUploadsDrawings");
    let data = await drawingsCollection.findOne({ _id: objectId });

    if (!data) {
      const documentsCollection = db.collection("elementUploadsDocuments");
      data = await documentsCollection.findOne({ _id: objectId });
    }

    if (!data || !data.r2FileName) {
      return NextResponse.json({ message: "Document not found or r2FileName is missing" }, { status: 404 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: data.r2FileName,
      ResponseContentDisposition: "inline"
    });

    const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });

    return NextResponse.json({ ...data, signedUrl }, { status: 200 });

  } catch (error) {
    console.error("Error fetching document data item:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
