/**
 * GenKgMID Database Connection
 * 
 * Manages the MongoDB connection using Mongoose, with caching to prevent
 * multiple connections in development hot-reload environments.
 * 
 * @module Source/Lib/DB
 */
import mongoose from "mongoose";
import { env } from "@/env.mjs";

// Ensure stricter type safety by using the validated env object
const MONGODB_URI = env.MONGODB_URI!;

declare global {
    var mongoose: any;
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default dbConnect;
