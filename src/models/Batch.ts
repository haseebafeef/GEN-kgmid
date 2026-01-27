/**
 * Batch Model
 * 
 * Represents a group of items to be processed. Stores configuration, status,
 * and progress metrics.
 * 
 * @module Source/Models/Batch
 */
import mongoose, { Schema, model, type Model, type Document } from "mongoose";

// Define supported batch statuses for consistent usage across the application
export const BATCH_STATUSES = ["PENDING", "UPLOADING", "PROCESSING", "COMPLETED", "FAILED", "STOPPED"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

// Pure data interface for frontend and API usage
// Decouples data structure from Mongoose-specific methods
export interface IBatch {
    status: BatchStatus;
    progress: number;
    fileName: string;
    readableId?: number; // Optional on creation, populated after
    totalItems: number;
    processedCount: number;
    createdAt: Date;
    updatedAt: Date;
    error?: string;
    expiresAt?: Date;
    // Configuration fields
    validKeys: string[];
    projectId?: string;
    strictMode: boolean;
    useQidOnly: boolean;
}

// Mongoose Document interface including internal database methods
export interface IBatchDocument extends IBatch, Document { }

const BatchSchema = new Schema<IBatchDocument>(
    {
        status: {
            type: String,
            enum: BATCH_STATUSES,
            default: "UPLOADING",
            index: true, // Indexed for efficient filtering
        },
        progress: { type: Number, default: 0 },
        fileName: { type: String, required: true },
        totalItems: { type: Number, required: true },
        processedCount: { type: Number, default: 0 },
        readableId: {
            type: Number,
            unique: true, // Sequential ID
            sparse: true // Sparse index allows unassigned IDs during initialization
        },

        // Configuration fields
        validKeys: { type: [String], default: [] },
        projectId: { type: String },
        strictMode: { type: Boolean, default: false },
        useQidOnly: { type: Boolean, default: false },
        error: { type: String },
        expiresAt: {
            type: Date,
            index: { expires: '10d' }
        }
    },
    {
        timestamps: true
        // versionKey: default (true)
    }
);

// Export Model, preventing overwrite during hot-reload
export default (mongoose.models.Batch as Model<IBatchDocument>) ||
    model<IBatchDocument>("Batch", BatchSchema);
