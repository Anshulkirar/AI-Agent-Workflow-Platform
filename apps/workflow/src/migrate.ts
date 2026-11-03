import { fileURLToPath } from "node:url";
import { runner } from "node-pg-migrate";
import { z } from "zod";

const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));
export type MigrationDirection = "up" | "down";
export async function migrate(
  databaseUrl: string,
  direction: MigrationDirection,
  log = console.info,
) {
  await runner({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    migrationsTable: "pgmigrations",
    direction,
    count: direction === "up" ? Infinity : 1,
    log,
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const direction = z.enum(["up", "down"]).parse(process.argv[2] ?? "up");
  const databaseUrl = z
    .string()
    .min(1, "WORKFLOW_DATABASE_URL is required")
    .parse(process.env.WORKFLOW_DATABASE_URL);
  try {
    await migrate(databaseUrl, direction);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
