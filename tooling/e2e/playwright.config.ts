import { defineConfig, devices } from "@playwright/test";

/**
 * The airplane test harness. Points at a already-running app (BASE) — the
 * dev server locally, or a preview/prod URL in CI. Single worker: the test
 * mutates and reads shared DB state.
 */
export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE ?? "http://localhost:3001",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
