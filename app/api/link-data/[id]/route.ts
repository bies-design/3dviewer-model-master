import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest, context: any) {
  try {
    const id = context.params.id;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid ID provided" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection("elementUploads");

    const objectId = new ObjectId(id);
    const data = await collection.findOne({ _id: objectId });

    if (!data) {
      return NextResponse.json({ message: "Data not found" }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching link data item:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}