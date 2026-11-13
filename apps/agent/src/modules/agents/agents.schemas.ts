import { z } from "zod";

export const agentStatusSchema = z.enum([
  "active",
  "inactive",
  "draft",
  "archived",
]);
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
const referenceSchema = z.string().trim().min(1).max(200);
const nodeSchema = z.object({
  id: referenceSchema.max(100),
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
    toolId: referenceSchema.optional(),
    config: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .default({}),
    status: z
      .enum(["idle", "running", "success", "error", "skipped"])
      .optional(),
  }),
});
const edgeSchema = z.object({
  id: referenceSchema.max(100),
  source: referenceSchema.max(100),
  target: referenceSchema.max(100),
  sourceHandle: z.string().max(100).nullable().optional(),
  label: z.string().max(200).optional(),
});
export const workflowSchema = z
  .object({
    nodes: z.array(nodeSchema).max(500),
    edges: z.array(edgeSchema).max(1000),
  })
  .superRefine((workflow, ctx) => {
    const ids = workflow.nodes.map((node) => node.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        path: ["nodes"],
        message: "Node ids must be unique.",
      });
    const nodeIds = new Set(ids);
    workflow.edges.forEach((edge) => {
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
    });
  });

const agentInputShape = z.object({
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
      .default("bot"),
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
    status: agentStatusSchema.default("draft"),
    instructions: z.string().max(100000).default(""),
    tools: z.array(referenceSchema).max(100).default([]),
    knowledge: z.array(referenceSchema).max(1000).default([]),
    settings: settingsSchema,
    workflow: workflowSchema.optional(),
  });
export const agentInputSchema = agentInputShape
  .superRefine((agent, ctx) => {
    if (agent.tools.some((tool, index) => agent.tools.indexOf(tool) !== index))
      ctx.addIssue({
        code: "custom",
        path: ["tools"],
        message: "Tool references must be unique.",
      });
    if (
      agent.knowledge.some(
        (source, index) => agent.knowledge.indexOf(source) !== index,
      )
    )
      ctx.addIssue({
        code: "custom",
        path: ["knowledge"],
        message: "Knowledge references must be unique.",
      });
  });
export const agentPatchSchema = agentInputShape.partial().superRefine((agent, ctx) => {
  if (
    agent.tools &&
    agent.tools.some((tool, index) => agent.tools?.indexOf(tool) !== index)
  )
    ctx.addIssue({
      code: "custom",
      path: ["tools"],
      message: "Tool references must be unique.",
    });
  if (
    agent.knowledge &&
    agent.knowledge.some(
      (source, index) => agent.knowledge?.indexOf(source) !== index,
    )
  )
    ctx.addIssue({
      code: "custom",
      path: ["knowledge"],
      message: "Knowledge references must be unique.",
    });
});
export const createVersionSchema = z.object({
  instructions: z.string().max(100000),
  tools: z.array(referenceSchema).max(100),
  knowledge: z.array(referenceSchema).max(1000),
  settings: settingsSchema,
  workflow: workflowSchema.optional(),
  changelog: z.string().trim().max(2000).optional(),
});
