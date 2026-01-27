/**
 * Next.js Configuration
 * 
 * Configures the Next.js build process. Imports environment validation to ensure
 * build fails fast if required keys are missing.
 * 
 * @module Config/Next
 */
/** @type {import('next').NextConfig} */
await import("./src/env.mjs");

const nextConfig = {};

export default nextConfig;
