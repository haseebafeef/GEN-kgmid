/**
 * Batch Download API
 * 
 * Streams batch results as a CSV file. Supports filtering by ID type (P646/P2671)
 * and strict label matching. Merges input data and results on-the-fly.
 * 
 * @module Source/App/Api/V2/Batch/Download
 */
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Batch from "@/models/Batch";
import BatchItem from "@/models/BatchItem";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        await dbConnect();

        // Validate Batch existence
        let batch;
        if (!isNaN(Number(id))) {
            batch = await Batch.findOne({ readableId: Number(id) });
        } else {
            batch = await Batch.findById(id);
        }

        if (!batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        const type = req.nextUrl.searchParams.get("type") || "v1"; // P646, P2671, v1, not_found
        const filter = req.nextUrl.searchParams.get("filter"); // 'matched' or null

        // Set response headers for file download
        const headers = new Headers();
        if (type === "not_found") {
            headers.set("Content-Type", "application/json");
            headers.set("Content-Disposition", `attachment; filename="batch-${id}-not_found.json"`);
        } else {
            headers.set("Content-Type", "text/csv");
            headers.set("Content-Disposition", `attachment; filename="batch-${id}-${type}.csv"`);
        }

        // Stream response data to memory-efficiently handle large datasets
        const stream = new ReadableStream({
            async start(controller) {
                const encode = (str: string) => controller.enqueue(new TextEncoder().encode(str));

                // Write Header
                if (type === "P646") encode("qid,P646\n");
                if (type === "P2671") encode("qid,P2671\n");
                if (type === "not_found") encode("[");

                // Iterate through items using a database cursor
                const cursor = BatchItem.find({
                    batchId: batch._id,
                    status: { $in: ["COMPLETED", "FAILED"] }
                }).cursor();

                let isFirstJsonItem = true;

                for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                    const item = { ...doc.data, ...doc.result };
                    if (!item) continue;

                    // Apply strict case-sensitive matching filter
                    if (filter === "matched") {
                        if (!item.label || !item.kgName || item.label !== item.kgName) {
                            continue;
                        }
                    }

                    // Apply strict rejection filter
                    // Identifies items with no KG ID or mismatched labels
                    if (filter === "strict_rejects") {
                        if (item.label && item.kgName && item.label === item.kgName) {
                            continue; // Skip valid matches
                        }
                    }

                    let line = "";
                    if (type === "not_found") {
                        // Logic depends on filter
                        let shouldInclude = false;

                        if (filter === "strict_rejects") {
                            // Already filtered out matches above, so include everything reaching here
                            shouldInclude = true;
                        } else {
                            // Default not_found behavior: Only if NO KG ID
                            if (!item.kgId) shouldInclude = true;
                        }

                        if (shouldInclude) {
                            const jsonItem = JSON.stringify({
                                item: item.originalUrl || `http://www.wikidata.org/entity/${item.qid}`,
                                itemLabel: item.label
                            });

                            if (!isFirstJsonItem) {
                                line = "," + jsonItem;
                            } else {
                                line = jsonItem;
                                isFirstJsonItem = false;
                            }
                        }
                    } else if (type === "P646" && item.kgType === "P646") {
                        line = `${item.qid},"""${item.kgId}"""\n`;
                    } else if (type === "P2671" && item.kgType === "P2671") {
                        line = `${item.qid},"""${item.kgId}"""\n`;
                    } else if (type === "v1" && item.kgId) {
                        line = `${item.qid}|${item.kgType}|"${item.kgId}"\n`;
                    }

                    if (line) encode(line);
                }

                if (type === "not_found") encode("]");

                controller.close();
            }
        });

        return new NextResponse(stream, { headers });

    } catch (e: any) {
        console.error("Download Error", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
