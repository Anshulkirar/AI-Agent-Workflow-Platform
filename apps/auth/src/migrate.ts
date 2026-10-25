import { fileURLToPath } from "node:url";
import { runner } from "node-pg-migrate";
import { z } from "zod";

// Resolves to apps/auth/migrations from both src/ (tsx) and dist/ (node).
const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));

export type MigrationDirection = "up" | "down";

/** Applies pending migrations (`up`), or rolls back the most recent one (`down`). */
export async function migrate(databaseUrl: string, direction: MigrationDirection, log = console.info) {
  await runner({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    migrationsTable: "pgmigrations",
    direction,
    count: direction === "up" ? Infinity : 1,
    log,
  });
}

// CLI: `npm run migrate -- up|down` (dev) or `node dist/migrate.js up` (Docker).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const direction = z.enum(["up", "down"]).parse(process.argv[2] ?? "up");
  const databaseUrl = z.string().min(1, "AUTH_DATABASE_URL is required").parse(process.env.AUTH_DATABASE_URL);
  try {
    await migrate(databaseUrl, direction);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
