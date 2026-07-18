import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TS source (main: src/index.ts); Next transpiles them.
  transpilePackages: ["@wellkept/schema", "@wellkept/permissions", "@wellkept/close-flow", "@wellkept/offline-queue"],
};

export default nextConfig;
