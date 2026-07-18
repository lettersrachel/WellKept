import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// One pool per process; survive Next dev hot-reload without leaking connections.
const globalForDb = globalThis as unknown as { wkPool?: pg.Pool };

const pool =
  globalForDb.wkPool ??
  new pg.Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept",
  });
globalForDb.wkPool = pool;

export const db = drizzle(pool);
