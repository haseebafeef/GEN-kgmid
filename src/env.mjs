import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Environment Variable Schema
// Validates all environment variables at build-time using Zod
export const env = createEnv({
    server: {
        // Database Connection String
        MONGODB_URI: z.string().url(),
        // Node Environment (development/production/test)
        NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
        // Inngest Keys (Optional in Dev, Required in Prod)
        INNGEST_EVENT_KEY: z.string().optional(),
        INNGEST_SIGNING_KEY: z.string().optional(),
    },
    client: {
        // Client-side variables (prefixed with NEXT_PUBLIC_)
    },
    // Runtime Env Configuration (Required for Next.js > 13.4.4)
    experimental__runtimeEnv: {},
});
