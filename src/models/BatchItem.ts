/**
 * BatchItem Model
 * 
 * Represents an individual item within a Batch. Stores the input data,
 * processing result (found KG ID), and specific status.
 * 
 * @module Source/Models/BatchItem
 */
import mongoose, { Schema, model, type Model, type Document } from "mongoose";

// Defined status constants
export const BATCH_ITEM_STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;
export type BatchItemStatus = (typeof BATCH_ITEM_STATUSES)[number];

// Pure data interface for frontend and API usage
export interface IBatchItem {
    batchId: mongoose.Types.ObjectId;
    data: any; // The original input item
    result?: any; // The processed result
    status: BatchItemStatus;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Mongoose Document interface including internal database methods
export interface IBatchItemDocument extends IBatchItem, Document { }

const BatchItemSchema = new Schema<IBatchItemDocument>(
    {
        batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
        data: { type: Schema.Types.Mixed, required: true },
        result: { type: Schema.Types.Mixed },
        status: {
            type: String,
            enum: BATCH_ITEM_STATUSES,
            default: "PENDING"
        },
        error: { type: String }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Compound index optimizes polling queries by matching Batch ID and Status
BatchItemSchema.index({ batchId: 1, status: 1 });

// Unique compound index ensures idempotent insertions
BatchItemSchema.index({ batchId: 1, "data._rowId": 1 }, { unique: true });

// Export Model, preventing overwrite during hot-reload
export default (mongoose.models.BatchItem as Model<IBatchItemDocument>) ||
    model<IBatchItemDocument>("BatchItem", BatchItemSchema);
