import { z } from "zod";

export const connectionStatusSchema = z.enum([
  "connected",
  "needs_setup",
  "error",
]);
export const jsonSchema = z.record(z.string(), z.unknown());
export const toolInputSchema = z
  .object({
    definitionKey: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).default(""),
    enabled: z.boolean().default(true),
    config: z.record(z.string(), z.unknown()).default({}),
    credentials: z.record(z.string(), z.unknown()).optional(),
    inputSchema: jsonSchema.default({}),
    outputSchema: jsonSchema.default({}),
  })
  .superRefine((value, ctx) => {
    if (value.credentials && Object.keys(value.credentials).length > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["credentials"],
        message: "Too many credential fields.",
      });
    }
  });
export const toolPatchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
  inputSchema: jsonSchema.optional(),
  outputSchema: jsonSchema.optional(),
});
export const connectionTestSchema = z.object({
  status: connectionStatusSchema,
  error: z.string().trim().max(2000).optional(),
});
export const associateAgentSchema = z.object({
  agentId: z.uuid(),
  config: z.record(z.string(), z.unknown()).default({}),
});
