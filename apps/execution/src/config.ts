import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4004),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  EXECUTION_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
  AGENT_SERVICE_URL: z.url().default("http://127.0.0.1:4003"),
  WORKFLOW_SERVICE_URL: z.url().default("http://127.0.0.1:4002"),
});

export type Config = z.output<typeof envSchema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(
      `Invalid execution service environment:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
