import pino from "pino";

// Configure logger based on environment
// Production: JSON format for aggregation tools (CloudWatch, Datadog, etc.)
// Development: Pretty-printed text for readability
const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: process.env.NODE_ENV === "development" ? {
        target: "pino-pretty",
        options: {
            colorize: true,
            ignore: "pid,hostname", // Reduce clutter in dev
            translateTime: "SYS:standard" // Readable timestamps
        }
    } : undefined
});

export default logger;
