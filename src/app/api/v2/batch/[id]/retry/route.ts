import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Batch from "@/models/Batch";
import { inngest } from "@/inngest/client";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const batchIdString = id;

    try {
        await dbConnect();

        // Locate Batch record by ID
        let query: any = { readableId: parseInt(batchIdString) };
        if (isNaN(query.readableId)) {
            query = { _id: batchIdString };
        }

        const batch = await Batch.findOne(query);

        if (!batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        // Validate Batch state for retry eligibility
        if (batch.status === "COMPLETED") {
            return NextResponse.json({ error: "Batch is already completed" }, { status: 400 });
        }

        if (!batch.validKeys || batch.validKeys.length === 0) {
            return NextResponse.json({
                error: "Cannot retry this batch: Missing API Configuration (Keys)."
            }, { status: 400 });
        }

        // Reset Batch status and error fields
        batch.status = "PENDING";
        batch.error = undefined;
        await batch.save();

        // Dispatch Inngest event to restart processing
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

        return NextResponse.json({ success: true, message: "Batch retried successfully" });

    } catch (e: any) {
        console.error("Retry API Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
