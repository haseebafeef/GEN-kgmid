/**
 * GenKgMID Inngest Functions
 * 
 * Defines background processing logic for Batches. Handles the scalable
 * asynchronous processing of Wikidata items against the Google Knowledge Graph.
 * 
 * @module Source/Inngest/Functions
 */
import { inngest } from "./client";
import dbConnect from "@/lib/db";
import Batch from "@/models/Batch";
import BatchItem, { IBatchItemDocument } from "@/models/BatchItem";
import { searchGoogleKGAction } from "@/app/actions";
import { pLimit } from "@/lib/concurrency";
import { WikidataItem } from "@/lib/wikidata";
import logger from "@/lib/logger";

export const processWikidata = inngest.createFunction(
    { id: "process-batch" },
    { event: "batch/created" },
    async ({ event, step }) => {
        const { batchId, validKeys, projectId, strictMode, useQidOnly } = event.data;

        await dbConnect();

        // Initialize batch processing state
        await step.run("init-processing", async () => {
            await Batch.findByIdAndUpdate(batchId, { status: "PROCESSING" });
        });

        // Process items in chunks until completion
        let hasMore = true;
        let chunkIndex = 0;
        const BATCH_SIZE = 100; // Process 100 items per step

        while (hasMore) {
            // Check cancellation
            const batchStatus = await step.run(`check-status-${chunkIndex}`, async () => {
                const t = await Batch.findById(batchId).select("status");
                return t?.status;
            });

            if (batchStatus === "STOPPED") break;

            const result = await step.run(`process-chunk-${chunkIndex}`, async () => {
                await dbConnect();

                // Fetch next chunk of pending items
                const itemsRequest = await BatchItem.find({
                    batchId: batchId,
                    status: "PENDING"
                }).limit(BATCH_SIZE).lean();

                const items = itemsRequest as unknown as IBatchItemDocument[];

                if (items.length === 0) {
                    return { processed: 0, hasMore: false };
                }

                // Execute processing with concurrency control
                // Limits the number of simultaneous API requests to respect rate limits
                const concurrency = Math.max(1, validKeys.length * 1);
                const limit = pLimit(concurrency);

                // Retrieve current batch state for progress syncing
                const batchDoc = await Batch.findById(batchId).select("totalItems processedCount");
                const totalItems = batchDoc?.totalItems || items.length;
                const baseProcessedCount = batchDoc?.processedCount || (chunkIndex * BATCH_SIZE);

                // Calculate dynamic update interval based on total batch size
                // Scales from high frequency (every item) for small batches to lower frequency for large batches
                // to optimize database performance while maintaining UI responsiveness.
                let updateInterval = Math.ceil(totalItems / 100);
                if (updateInterval < 1) updateInterval = 1;

                const useGranularUpdates = totalItems <= 10000;
                let itemsCompletedInChunk = 0;

                const promises = items.map((dbItem, idx) => {
                    const itemData = dbItem.data as WikidataItem;
                    // Distribute load across all available keys using round-robin rotation
                    const key = validKeys[(chunkIndex * BATCH_SIZE + idx) % validKeys.length];

                    return limit(async () => {
                        try {
                            // Check if ID is already present in source data
                            if (itemData.kgId) {
                                await BatchItem.findByIdAndUpdate(dbItem._id, {
                                    status: "COMPLETED"
                                });
                                // Include pre-filled items in progress calculation
                                if (useGranularUpdates) {
                                    itemsCompletedInChunk++;
                                }
                                return true;
                            }

                            // Apply jitter to distribute request timing
                            // Prevents congestion from synchronized requests
                            const jitter = Math.floor(Math.random() * 100) + 50;
                            await new Promise(r => setTimeout(r, jitter));

                            let kgResult: any = null;
                            let attempt = 0;
                            const MAX_RETRIES = 3;

                            // Retry logic with exponential backoff for transient failures
                            // Handles Rate Limits (429) gracefully
                            while (attempt <= MAX_RETRIES) {
                                try {
                                    kgResult = await searchGoogleKGAction(itemData.label, key, {
                                        projectId,
                                        qid: itemData.qid,
                                        strictMode,
                                        useQidOnly
                                    });
                                    break; // Success
                                } catch (err: any) {
                                    const isRateLimit = err.message && (err.message.includes("429") || err.message.toLowerCase().includes("quota"));

                                    if (isRateLimit) {
                                        attempt++;
                                        logger.warn({ batchId, label: itemData.label, attempt, maxRetries: MAX_RETRIES }, "Rate Limit hit");

                                        if (attempt > MAX_RETRIES) throw err; // Fail after max retries

                                        // Exponential Backoff Strategy: 1s, 2s, 4s...
                                        // Helps the system recover gracefully during congestion
                                        const delay = 1000 * Math.pow(2, attempt - 1);
                                        // Add random jitter to retry delay too
                                        const retryJitter = Math.floor(Math.random() * 1000);
                                        await new Promise(r => setTimeout(r, delay + retryJitter));
                                    } else {
                                        throw err; // Other errors fail immediately
                                    }
                                }
                            }

                            let finalResult: any = {};
                            if (kgResult) {
                                finalResult = {
                                    kgId: kgResult.id,
                                    kgType: kgResult.type,
                                    kgDescription: kgResult.description,
                                    kgName: kgResult.name,
                                    kgSchemaType: kgResult.schemaType
                                };
                            }

                            // Update Item
                            await BatchItem.findByIdAndUpdate(dbItem._id, {
                                status: "COMPLETED",
                                result: finalResult
                            });

                            // Perform intermediate granular progress updates for smaller batches
                            // This ensures the UI remains responsive without overloading the database with writes
                            if (useGranularUpdates) {
                                itemsCompletedInChunk++;
                                if (itemsCompletedInChunk % updateInterval === 0) {
                                    const currentTotal = baseProcessedCount + itemsCompletedInChunk;
                                    const prog = Math.round((currentTotal / totalItems) * 100);

                                    // Asynchronous update to avoid blocking the processing loop
                                    Batch.findByIdAndUpdate(batchId, {
                                        processedCount: currentTotal,
                                        progress: prog
                                    }).catch(e => console.error("Progress update failed", e));
                                }
                            }

                            return true;

                        } catch (e: any) {
                            await BatchItem.findByIdAndUpdate(dbItem._id, {
                                status: "FAILED",
                                error: e.message
                            });
                            if (useGranularUpdates) {
                                itemsCompletedInChunk++;
                            }
                            return false;
                        }
                    });
                });

                await Promise.all(promises);

                // Update Batch Progress (Final Accurate Sync)
                const totalFinished = await BatchItem.countDocuments({
                    batchId: batchId,
                    status: { $in: ["COMPLETED", "FAILED"] }
                });

                const total = await BatchItem.countDocuments({ batchId: batchId });
                const progress = total > 0 ? Math.round((totalFinished / total) * 100) : 0;

                await Batch.findByIdAndUpdate(batchId, {
                    processedCount: totalFinished,
                    progress: progress
                });

                return {
                    processed: items.length,
                    hasMore: items.length === BATCH_SIZE
                };
            });

            if (!result.hasMore) {
                hasMore = false;
            }
            chunkIndex++;

            if (chunkIndex > 2000) hasMore = false;
        }

        // Mark batch as completed
        await step.run("mark-completed", async () => {
            const finalCheck = await Batch.findById(batchId).select("status");
            if (finalCheck?.status !== "STOPPED") {
                await Batch.findByIdAndUpdate(batchId, { status: "COMPLETED", progress: 100 });
            }
        });
    }
);
