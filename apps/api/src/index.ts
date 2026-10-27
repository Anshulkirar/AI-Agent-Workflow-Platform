import { Redis } from "ioredis";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

// Fail fast instead of queueing: with `skipOnError` the rate limiter then lets requests through.
const redis = config.REDIS_URL
  ? new Redis(config.REDIS_URL, { connectTimeout: 500, maxRetriesPerRequest: 1, enableOfflineQueue: false })
  : undefined;
const app = buildApp({ config, redis });
redis?.on("error", (error) => app.log.warn({ err: error }, "redis unavailable; rate limits not enforced"));
if (!redis) app.log.warn("REDIS_URL not set; rate limits are counted per process");

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
    // Stop taking requests and let in-flight ones finish, then disconnect from Redis.
    app
      .close()
      .then(() => redis?.quit())
      .then(
        () => process.exit(0),
        (error: unknown) => {
          app.log.error(error, "shutdown failed");
          process.exit(1);
        },
      );
  });
}
