import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import dbConnect from "@/lib/db";
import BatchItem from "@/models/BatchItem";
import logger from "@/lib/logger";

export const maxDuration = 60; // Allow 60s for DB inserts

// Schema definition for input payload validation
const UploadChunkSchema = z.object({
    batchId: z.string().min(1, "Batch ID is required"),
    items: z.array(z.record(z.string(), z.any())).min(1, "Items array cannot be empty")
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate and parse request body
        const result = UploadChunkSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: "Invalid payload", details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { batchId, items } = result.data;

        // Map items to database schema format with explicit types
        const batchItems = items.map((item) => ({
            batchId: new mongoose.Types.ObjectId(batchId),
            data: item,
            status: "PENDING" as const
        }));

        await dbConnect();

        // Execute idempotent bulk upsert operation
        // Uses unique row ID to prevent duplicate processing on retries
        const operations = batchItems.map((item) => ({
            updateOne: {
                filter: { batchId: item.batchId, "data._rowId": item.data._rowId },
                update: { $setOnInsert: item },
                upsert: true
            }
        }));

        await BatchItem.bulkWrite(operations);

        return NextResponse.json({ success: true, count: items.length });

    } catch (e: any) {
        logger.error({ err: e }, "Upload Chunk Error");
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
