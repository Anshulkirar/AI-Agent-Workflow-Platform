import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  // --- Upstream services (one URL per service in src/services.ts) ---
  AUTH_SERVICE_URL: z.url().default("http://127.0.0.1:4001"),
  // How long a service may take to send response headers (and then the body) before we give up.
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().min(100).default(10_000),

  // --- Request checks ---
  // Browser origins allowed to make state-changing requests (comma-separated).
  WEB_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://127.0.0.1:3000")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
  // Which hops may set X-Forwarded-For: the web server / load balancer on a private network.
  TRUST_PROXY: z.string().default("loopback,uniquelocal"),

  // --- Rate limiting (per client IP, across every route except health checks) ---
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(60_000),
  // With Redis, every gateway replica shares the same counters. Without it, each process counts alone.
  REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),
});

export type Config = z.output<typeof envSchema>;

/** Parses the environment once at startup; throws with every problem listed if it is invalid. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid API gateway environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
