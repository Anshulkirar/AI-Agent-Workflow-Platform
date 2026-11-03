import { describe, expect, it } from "vitest";
import {
  graphSchema,
  workflowInputSchema,
} from "../src/modules/workflows/workflows.schemas.js";

describe("workflow validation", () => {
  it("accepts a connected workflow graph", () => {
    expect(
      graphSchema.safeParse({
        nodes: [
          {
            id: "input",
            position: { x: 0, y: 0 },
            data: { kind: "input", label: "Input", config: {} },
          },
          {
            id: "output",
            position: { x: 1, y: 1 },
            data: { kind: "output", label: "Output", config: {} },
          },
        ],
        edges: [{ id: "edge", source: "input", target: "output" }],
      }).success,
    ).toBe(true);
  });
  it("rejects duplicate ids and dangling edges", () => {
    const result = graphSchema.safeParse({
      nodes: [
        {
          id: "input",
          position: { x: 0, y: 0 },
          data: { kind: "input", label: "Input", config: {} },
        },
        {
          id: "input",
          position: { x: 1, y: 1 },
          data: { kind: "output", label: "Output", config: {} },
        },
      ],
      edges: [{ id: "edge", source: "missing", target: "input" }],
    });
    expect(result.success).toBe(false);
  });
  it("normalizes names and tags", () => {
    const parsed = workflowInputSchema.parse({
      name: "  Triage  ",
      trigger: { type: "manual" },
      tags: [" support "],
      graph: { nodes: [], edges: [] },
    });
    expect(parsed.name).toBe("Triage");
    expect(parsed.tags).toEqual(["support"]);
  });
});
