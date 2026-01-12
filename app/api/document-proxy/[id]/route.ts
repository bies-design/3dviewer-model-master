import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { R2 } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(request: NextRequest, context: any) {
  try {
    const id = context.params.id;

    if (!id || !ObjectId.isValid(id)) {
      return new NextResponse("Invalid ID provided", { status: 400 });
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
      return new NextResponse("Document not found or r2FileName is missing", {
        status: 404,
      });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: data.r2FileName,
    });

    const signedUrl = await getSignedUrl(R2, command, { expiresIn: 60 });

    const r2Response = await fetch(signedUrl);

    if (!r2Response.ok) {
      return new NextResponse("Failed to fetch file from storage", {
        status: 500,
      });
    }

    const pdfBuffer = await r2Response.arrayBuffer();

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `inline; filename="${data.originalFileName}"`
    );

    return new NextResponse(pdfBuffer, { status: 200, headers });
  } catch (error) {
    console.error("Error in document proxy:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
