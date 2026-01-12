import { NextResponse } from 'next/server';
import clientPromise from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("model-viewer");
    const collection = db.collection("large_model_files");

    const models = await collection.aggregate([
      {
        $lookup: {
          from: "model_groups",
          localField: "groupIds", // Use groupIds array
          foreignField: "_id",
          as: "groupInfo",
        },
      },
      {
        $lookup: {
          from: "folders",
          localField: "folderId",
          foreignField: "_id",
          as: "folderInfo",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          r2FileName: 1,
          uploadedAt: 1,
          groupIds: { $ifNull: ["$groupIds", []] }, // Ensure groupIds is an array, even if null
          groupNames: {
            $map: {
              input: "$groupInfo",
              as: "group",
              in: "$$group.name",
            },
          },
          folderId: { $arrayElemAt: ["$folderInfo._id", 0] }, // Get the first folder ID, or null
          folderName: { $arrayElemAt: ["$folderInfo.name", 0] }, // Get the first folder name, or null
        },
      },
      {
        $sort: { uploadedAt: -1 },
      },
    ]).toArray();

    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching R2 models:', error);
    return NextResponse.json({ error: 'Failed to fetch R2 models' }, { status: 500 });
  }
}