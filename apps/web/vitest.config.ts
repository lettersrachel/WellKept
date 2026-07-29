import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Session AP: the first test runner in apps/web. Every other package has
 * had one; the app - which holds the auth path, the reveal path and all
 * 40 server actions - has never had a place to put a test, so every
 * guard doctrine in CLAUDE.md stopped at the package boundary.
 *
 * Node environment, not jsdom: the targets that matter here are
 * server-side (permission decisions, redirect allowlists, fail-closed
 * predicates), not components. The `@/` alias mirrors tsconfig so tests
 * import exactly what the app imports.
 */
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
