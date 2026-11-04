import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4005),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  TOOLS_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  TOOL_CREDENTIALS_KEY: z
    .string()
    .min(32, "TOOL_CREDENTIALS_KEY must contain at least 32 characters"),
  AGENT_SERVICE_URL: z.url().default("http://127.0.0.1:4003"),
});

export type Config = z.output<typeof envSchema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success)
    throw new Error(
      `Invalid tools service environment:\n${z.prettifyError(result.error)}`,
    );
  return result.data;
}
