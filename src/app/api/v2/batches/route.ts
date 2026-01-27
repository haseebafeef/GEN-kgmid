import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Batch from "@/models/Batch";

export const dynamic = 'force-dynamic'; // Ensure no caching

export async function GET() {
    try {
        await dbConnect();

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const batches = await Batch.find({
            createdAt: { $gte: sevenDaysAgo }
        })
            .select("status fileName totalItems processedCount progress createdAt _id readableId")
            .sort({ createdAt: -1 })
            .limit(50); // Safety limit

        return NextResponse.json(batches);
    } catch (e: any) {
        console.error("Recent Batches API Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
