import { Redis } from "ioredis";
import { createPool } from "@agentflow/db";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
let app: ReturnType<typeof buildApp>;
const db = createPool(config.EXECUTION_DATABASE_URL, {
  onError: (error) => app?.log.error(error, "idle database client error"),
});
const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
app = buildApp({ config, db, redis });

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error, "failed to start");
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void Promise.all([app.close(), db.end(), redis.quit()]).then(
      () => process.exit(0),
      (error) => {
        app.log.error(error, "shutdown failed");
        process.exit(1);
      },
    );
  });
}
