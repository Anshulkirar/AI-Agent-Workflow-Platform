import { describe, expect, it } from "vitest";
import {
  agentInputSchema,
  workflowSchema,
} from "../src/modules/agents/agents.schemas.js";
describe("agent validation", () => {
  it("normalizes configuration and defaults settings", () => {
    const parsed = agentInputSchema.parse({
      name: " Support agent ",
      tools: ["search"],
      knowledge: ["faq"],
    });
    expect(parsed.name).toBe("Support agent");
    expect(parsed.status).toBe("draft");
    expect(parsed.settings.model).toBe("gpt-4o-mini");
  });
  it("rejects duplicate tool and knowledge references", () => {
    expect(
      agentInputSchema.safeParse({
        name: "Agent",
        tools: ["search", "search"],
        knowledge: ["faq"],
      }).success,
    ).toBe(false);
    expect(
      agentInputSchema.safeParse({
        name: "Agent",
        tools: ["search"],
        knowledge: ["faq", "faq"],
      }).success,
    ).toBe(false);
  });
  it("rejects dangling workflow edges", () => {
    expect(
      workflowSchema.safeParse({
        nodes: [
          {
            id: "start",
            position: { x: 0, y: 0 },
            data: { kind: "input", label: "Input", config: {} },
          },
        ],
        edges: [{ id: "edge", source: "start", target: "missing" }],
      }).success,
    ).toBe(false);
  });
});
