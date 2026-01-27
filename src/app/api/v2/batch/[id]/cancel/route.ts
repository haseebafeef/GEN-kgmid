import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Batch from "@/models/Batch";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await dbConnect();

        let query: any = { readableId: parseInt(id) };
        if (isNaN(query.readableId)) {
            query = { _id: id };
        }

        const batch = await Batch.findOne(query);

        if (!batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        if (batch.status === "COMPLETED" || batch.status === "FAILED") {
            return NextResponse.json({ error: "Batch already finished" }, { status: 400 });
        }

        batch.status = "STOPPED";
        await batch.save();

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
