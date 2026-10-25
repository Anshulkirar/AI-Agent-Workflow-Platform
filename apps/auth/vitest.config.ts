import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Same .env the dev script uses; test workers inherit these variables.
const rootEnv = new URL("../../.env", import.meta.url);
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    // Every file truncates the same test database, so files must not run in parallel.
    fileParallelism: false,
  },
});
