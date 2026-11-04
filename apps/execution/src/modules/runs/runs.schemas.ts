import { z } from "zod";

export const runStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export const createRunSchema = z.object({
  sourceType: z.enum(["agent", "workflow"]),
  sourceId: z.uuid(),
  input: z.union([z.string().max(100000), z.record(z.string(), z.unknown())]),
  trigger: z
    .enum(["manual", "api", "schedule", "webhook", "test", "rerun"])
    .default("api"),
  timeoutMs: z.number().int().min(100).max(3600000).default(300000),
  maxAttempts: z.number().int().min(1).max(10).default(1),
  rerunOf: z.uuid().optional(),
});

export const logSchema = z.object({
  level: z.enum(["debug", "info", "success", "warn", "error"]),
  message: z.string().trim().min(1).max(4000),
  stepId: z.string().max(100).optional(),
});
export const retrySchema = z.object({
  timeoutMs: z.number().int().min(100).max(3600000).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
});
