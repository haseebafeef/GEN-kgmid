/**
 * Counter Model
 * 
 * Simple atomic counter for generating sequential readable IDs (e.g., Batch #1001).
 * 
 * @module Source/Models/Counter
 */
import mongoose, { Schema, model, type Model, type Document } from "mongoose";

export interface ICounter {
    _id: string;
    seq: number;
}

// Omit _id from Document to allow string override from ICounter
export interface ICounterDocument extends ICounter, Omit<Document, "_id"> { }

const CounterSchema = new Schema<ICounterDocument>({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
}, {
    versionKey: false
});

export default (mongoose.models.Counter as Model<ICounterDocument>) ||
    model<ICounterDocument>("Counter", CounterSchema);
