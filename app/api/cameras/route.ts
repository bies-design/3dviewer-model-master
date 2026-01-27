import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const elementName = searchParams.get("elementName");

    const client = await clientPromise;
    const db = client.db("model-viewer");

    const query = elementName ? {elementName} : {}

    const cameras = await db.collection("cameras").find(query).toArray();

    return NextResponse.json(cameras);
  } catch (error) {
    console.error("Failed to fetch cameras:", error);
    return NextResponse.json({ error: "Failed to fetch cameras" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db("model-viewer");
    
    const result = await db.collection("cameras").insertOne(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to create camera:", error);
    return NextResponse.json({ error: "Failed to create camera" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Camera ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("model-viewer");
    
    const result = await db.collection("cameras").deleteOne({ id });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to delete camera:", error);
    return NextResponse.json({ error: "Failed to delete camera" }, { status: 500 });
  }
}