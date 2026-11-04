import { createPool } from "@agentflow/db";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
let app: ReturnType<typeof buildApp>;
const db = createPool(config.TOOLS_DATABASE_URL, {
  onError: (error) => app?.log.error(error, "idle database client error"),
});
app = buildApp({ config, db });
try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error, "failed to start");
  process.exit(1);
}
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app
      .close()
      .then(() => db.end())
      .then(
        () => process.exit(0),
        (error) => {
          app.log.error(error, "shutdown failed");
          process.exit(1);
        },
      );
  });
}
