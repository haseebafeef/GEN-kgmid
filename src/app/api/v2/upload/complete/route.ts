import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Batch from "@/models/Batch";
import { inngest } from "@/inngest/client";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { batchId } = body;

        if (!batchId) {
            return NextResponse.json({ error: "Missing batchId" }, { status: 400 });
        }

        await dbConnect();

        // 1. Update Batch Status
        const batch = await Batch.findByIdAndUpdate(batchId, {
            status: "PENDING"
        }, { new: true });

        if (!batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        // 2. Trigger Inngest Event
        await inngest.send({
            name: "batch/created",
            data: {
                batchId: batch._id.toString(),
                validKeys: batch.validKeys,
                projectId: batch.projectId,
                strictMode: batch.strictMode,
                useQidOnly: batch.useQidOnly
            },
        });

        return NextResponse.json({ success: true, readableId: batch.readableId });

    } catch (e: any) {
        console.error("Upload Complete Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
