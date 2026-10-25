import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Loopback by default; containers set HOST=0.0.0.0 so the gateway can reach the service.
    HOST: z.string().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4001),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    AUTH_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

    // Unset means "Secure in production only" (resolved below).
    COOKIE_SECURE: z.stringbool().optional(),
    // "Remember me" sessions vs. sessions that end when the browser closes.
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    SESSION_SHORT_TTL_HOURS: z.coerce.number().int().min(1).max(72).default(12),

    // Attempts allowed per window before answering 429.
    LOGIN_RATE_LIMIT: z.coerce.number().int().min(1).default(10),
    REGISTER_RATE_LIMIT: z.coerce.number().int().min(1).default(10),
  })
  .transform((env) => ({
    ...env,
    COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === "production",
  }));

export type Config = z.output<typeof envSchema>;

/** Parses the environment once at startup; throws with every problem listed if it is invalid. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid auth service environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
