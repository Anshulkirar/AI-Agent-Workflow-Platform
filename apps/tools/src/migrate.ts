import { fileURLToPath } from "node:url";
import { runner } from "node-pg-migrate";
import { z } from "zod";

const migrationsDir = fileURLToPath(new URL("../migrations", import.meta.url));
export async function migrate(
  databaseUrl: string,
  direction: "up" | "down",
  log = console.info,
) {
  await runner({
    databaseUrl,
    dir: migrationsDir,
    migrationsTable: "pgmigrations",
    direction,
    count: direction === "up" ? Infinity : 1,
    log,
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const direction = z.enum(["up", "down"]).parse(process.argv[2] ?? "up");
  try {
    await migrate(
      z.string().min(1).parse(process.env.TOOLS_DATABASE_URL),
      direction,
    );
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
