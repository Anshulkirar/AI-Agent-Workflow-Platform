import { createPool } from "@agentflow/db";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { scheduleSessionCleanup } from "./modules/sessions/session-cleanup.js";

const config = loadConfig();
const db = createPool(config.AUTH_DATABASE_URL, {
  onError: (error) => app.log.error(error, "idle database client error"),
});
const app = buildApp({ config, db });
const stopCleanup = scheduleSessionCleanup(db, app.log);

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error, "failed to start");
  process.exit(1);
}

// `once`: a second Ctrl+C falls through to Node's default and force-quits.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, "shutting down");
    stopCleanup();
    // Stop taking requests and let in-flight ones finish, then release database connections.
    app
      .close()
      .then(() => db.end())
      .then(
        () => process.exit(0),
        (error: unknown) => {
          app.log.error(error, "shutdown failed");
          process.exit(1);
        },
      );
  });
}
