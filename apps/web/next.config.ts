import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TS source (main: src/index.ts); Next transpiles them.
  transpilePackages: ["@wellkept/schema", "@wellkept/permissions", "@wellkept/close-flow", "@wellkept/offline-queue", "@wellkept/vault", "@wellkept/trigger-engine"],
  // Sprint-10 hardening baseline (REQ-070). Full CSP needs nonce plumbing;
  // queued for the pen-review pass.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
