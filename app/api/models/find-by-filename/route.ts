import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");

    if (!fileName) {
      return NextResponse.json(
        { error: "fileName query parameter is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    
    // We search in 'elementUploads' as that's where 3D models are stored.
    const collection = db.collection("elementUploads");

    // Perform an exact match search for the original file name.
    const modelDoc = await collection.findOne({ originalFileName: fileName });

    if (!modelDoc) {
      return NextResponse.json(
        { error: `Model with fileName '${fileName}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(modelDoc, { status: 200 });

  } catch (error) {
    console.error("Error fetching model by filename:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch model data", details: errorMessage },
      { status: 500 }
    );
  }
}