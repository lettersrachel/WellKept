import { defineConfig } from "vitest/config";

// WK-DEV-004: this package holds 100% coverage or the build fails.
// Coverage measures src/index.ts (the canonical module). The .mjs files are
// the pre-repo verified mirror, runnable standalone via `node --test`.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/index.ts"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
