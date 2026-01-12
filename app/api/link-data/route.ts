import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const elementName = searchParams.get("elementName");

    if (!elementName) {
      return NextResponse.json(
        { error: "elementName query parameter is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collectionsToSearch = [
      { name: "elementUploads", category: "3dmodels" },
      { name: "elementUploadsDrawings", category: "drawings" },
      { name: "elementUploadsDocuments", category: "documents" },
    ];

    // Create a regex to find files with the format *@{elementName}.*
    const regex = new RegExp(`^.*@${elementName}(\\..*)?$`, "i");

    const searchPromises = collectionsToSearch.map(async ({ name, category }) => {
      const collection = db.collection(name);
      const docs = await collection.find({ originalFileName: regex }).toArray();
      return docs.map(doc => ({ ...doc, category }));
    });

    const results = await Promise.all(searchPromises);
    const linkedData = results.flat();

    return NextResponse.json(linkedData, { status: 200 });

  } catch (error) {
    console.error("Error fetching linked data:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch linked data", details: errorMessage },
      { status: 500 }
    );
  }
}
