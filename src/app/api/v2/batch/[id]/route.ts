/**
 * Batch Details API
 * 
 * Retrieves batch status, metrics (found/matched counts), and a preview of items.
 * Merges input data with processing results for the frontend preview.
 * 
 * @module Source/App/Api/V2/Batch/Details
 */
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Batch from "@/models/Batch";
import BatchItem from "@/models/BatchItem";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        await dbConnect();

        // Retrieve Batch record to ensure existence
        let batch;
        if (!isNaN(Number(id))) {
            batch = await Batch.findOne({ readableId: Number(id) }).lean();
        } else {
            batch = await Batch.findById(id).lean();
        }

        if (!batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        // Fetch associated BatchItems with pagination
        const limitParam = req.nextUrl.searchParams.get("limit");
        const limit = limitParam === "all" ? 0 : (parseInt(limitParam || "100") || 100);

        let itemsQuery = BatchItem.find({ batchId: batch._id });
        if (limit > 0) {
            itemsQuery = itemsQuery.limit(limit);
        }
        const items = await itemsQuery.lean();

        // Transform items to API response format
        const inputData = items.map((i: any) => i.data);
        const outputData = items
            .filter((i: any) => i.status === "COMPLETED" || i.status === "FAILED")
            .map((i: any) => ({
                ...i.data,
                ...(i.result || {}),
                error: i.error
            }));

        // Compute real-time discovery metrics for Knowledge Graph IDs
        const foundCountP646 = await BatchItem.countDocuments({
            batchId: batch._id,
            status: "COMPLETED",
            "result.kgId": { $exists: true, $ne: null },
            "result.kgType": "P646"
        });

        const foundCountP2671 = await BatchItem.countDocuments({
            batchId: batch._id,
            status: "COMPLETED",
            "result.kgId": { $exists: true, $ne: null },
            "result.kgType": "P2671"
        });

        // Compute strict match metrics (Label equals KG Name)
        const matchedCountP646 = await BatchItem.countDocuments({
            batchId: batch._id,
            status: "COMPLETED",
            "result.kgType": "P646",
            $expr: { $eq: ["$data.label", "$result.kgName"] }
        });

        const matchedCountP2671 = await BatchItem.countDocuments({
            batchId: batch._id,
            status: "COMPLETED",
            "result.kgType": "P2671",
            $expr: { $eq: ["$data.label", "$result.kgName"] }
        });

        // Construct final response payload
        const responseData = {
            ...batch,
            foundCountP646,
            foundCountP2671,
            matchedCountP646,
            matchedCountP2671,
            inputData, // Preview only
            outputData, // Preview only
            isTruncated: true // Flag for frontend
        };

        return NextResponse.json(responseData);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
