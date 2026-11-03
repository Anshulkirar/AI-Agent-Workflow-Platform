import { z } from "zod";

export const workflowStatusSchema = z.enum([
  "active",
  "paused",
  "draft",
  "archived",
]);
export const triggerSchema = z
  .object({
    type: z.enum(["manual", "schedule", "webhook", "event"]),
    schedule: z.string().trim().max(200).optional(),
    event: z.string().trim().max(200).optional(),
  })
  .superRefine((trigger, ctx) => {
    if (trigger.type === "schedule" && !trigger.schedule)
      ctx.addIssue({
        code: "custom",
        path: ["schedule"],
        message: "Schedule is required for scheduled workflows.",
      });
    if (trigger.type === "event" && !trigger.event)
      ctx.addIssue({
        code: "custom",
        path: ["event"],
        message: "Event is required for event workflows.",
      });
  });

export const settingsSchema = z
  .object({
    model: z.string().trim().min(1).max(100).default("gpt-4o-mini"),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(1).max(100000).default(2048),
    topP: z.number().min(0).max(1).default(1),
    streaming: z.boolean().default(true),
    memory: z.boolean().default(false),
    responseFormat: z.enum(["text", "markdown", "json"]).default("text"),
  })
  .default({
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
    streaming: true,
    memory: false,
    responseFormat: "text",
  });

const nodeSchema = z.object({
  id: z.string().trim().min(1).max(100),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  data: z.object({
    kind: z.enum([
      "input",
      "llm",
      "agent",
      "tool",
      "condition",
      "transform",
      "output",
    ]),
    label: z.string().trim().min(1).max(200),
    toolId: z.string().trim().max(200).optional(),
    config: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .default({}),
  }),
});
const edgeSchema = z.object({
  id: z.string().trim().min(1).max(100),
  source: z.string().trim().min(1).max(100),
  target: z.string().trim().min(1).max(100),
  sourceHandle: z.string().max(100).nullable().optional(),
  label: z.string().max(200).optional(),
});
export const graphSchema = z
  .object({
    nodes: z.array(nodeSchema).max(500),
    edges: z.array(edgeSchema).max(1000),
  })
  .superRefine((graph, ctx) => {
    const ids = graph.nodes.map((node) => node.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        path: ["nodes"],
        message: "Node ids must be unique.",
      });
    const nodeIds = new Set(ids);
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.source))
        ctx.addIssue({
          code: "custom",
          path: ["edges"],
          message: `Edge references unknown source "${edge.source}".`,
        });
      if (!nodeIds.has(edge.target))
        ctx.addIssue({
          code: "custom",
          path: ["edges"],
          message: `Edge references unknown target "${edge.target}".`,
        });
    }
    if (graph.nodes.length === 0) return;
    const kinds = graph.nodes
      .filter((node) => ["input", "output"].includes(node.data.kind))
      .map((node) => node.data.kind);
    if (!kinds.includes("input") || !kinds.includes("output"))
      ctx.addIssue({
        code: "custom",
        path: ["nodes"],
        message:
          "A workflow with nodes must contain at least one input and one output node.",
      });
  });

export const workflowInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  icon: z
    .enum([
      "bot",
      "search",
      "code",
      "chart",
      "pen",
      "headset",
      "mail",
      "globe",
      "brain",
      "sparkles",
      "file",
      "users",
    ])
    .default("sparkles"),
  color: z
    .enum([
      "violet",
      "blue",
      "sky",
      "emerald",
      "amber",
      "orange",
      "rose",
      "pink",
    ])
    .default("violet"),
  status: workflowStatusSchema.default("draft"),
  trigger: triggerSchema.default({ type: "manual" }),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  graph: graphSchema.default({ nodes: [], edges: [] }),
  settings: settingsSchema,
});
export const workflowPatchSchema = workflowInputSchema.partial();
export const workflowUpdateSchema = workflowInputSchema;
export const createVersionSchema = z.object({
  graph: graphSchema,
  settings: settingsSchema.optional(),
  changelog: z.string().trim().max(2000).optional(),
});
