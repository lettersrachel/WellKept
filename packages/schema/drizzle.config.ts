import { defineConfig } from "drizzle-kit";

// Migrations generate from src/tables.ts and live in ./drizzle (WK-DEV-004 S2).
// DATABASE_URL defaults to the docker-compose dev instance.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/tables.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
  },
});
