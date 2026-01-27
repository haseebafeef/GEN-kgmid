/**
 * Upload Initialization API
 * 
 * Creates a new Batch record and returns a unique Batch ID.
 * 
 * @module Source/App/Api/V2/Upload/Init
 */
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Batch from "@/models/Batch";
import Counter from "@/models/Counter";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { fileName, totalItems, validKeys, projectId, strictMode, useQidOnly } = body;

        await dbConnect();

        // 1. Get Next Sequence
        const counter = await Counter.findByIdAndUpdate(
            { _id: "batchId" }, // Changed from taskId to batchId for counter tracking
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const readableId = counter.seq;

        // 2. Create Batch in DB
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 10); // 10 days retention

        const batch = await Batch.create({
            fileName,
            totalItems,
            processedCount: 0,
            status: "UPLOADING",
            validKeys,
            projectId,
            strictMode,
            useQidOnly,
            expiresAt,
            readableId
        });

        return NextResponse.json({
            batchId: batch._id.toString(),
            readableId: batch.readableId
        });

    } catch (e: any) {
        console.error("Upload Init Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
