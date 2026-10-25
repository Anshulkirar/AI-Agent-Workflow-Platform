import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  AUTH_SERVICE_URL: z.url().default("http://127.0.0.1:4001"),
  // Browser origins allowed to make state-changing requests (comma-separated).
  WEB_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://127.0.0.1:3000")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
  // Which hops may set X-Forwarded-For: the web server / load balancer on a private network.
  TRUST_PROXY: z.string().default("loopback,uniquelocal"),
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
