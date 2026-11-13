import { describe, expect, it } from "vitest";
import { createExecutionPlan } from "../src/modules/runs/workflow.engine.js";

describe("workflow execution planning", () => {
  it("orders dependencies and starts independent nodes in parallel layers", () => {
    const graph = {
      nodes: [
        { id: "input", data: { kind: "input" } },
        { id: "a", data: { kind: "transform" } },
        { id: "b", data: { kind: "transform" } },
        { id: "output", data: { kind: "output" } },
      ],
      edges: [
        { id: "1", source: "input", target: "a" },
        { id: "2", source: "input", target: "b" },
        { id: "3", source: "a", target: "output" },
        { id: "4", source: "b", target: "output" },
      ],
    };
    const plan = createExecutionPlan(graph as never);
    expect(plan.layers[0]).toEqual(["input"]);
    expect(plan.layers[1]?.sort()).toEqual(["a", "b"]);
    expect(plan.layers[2]).toEqual(["output"]);
  });

  it("rejects circular workflows", () => {
    expect(() =>
      createExecutionPlan({
        nodes: [
          { id: "a", data: { kind: "transform" } },
          { id: "b", data: { kind: "transform" } },
        ],
        edges: [
          { id: "1", source: "a", target: "b" },
          { id: "2", source: "b", target: "a" },
        ],
      } as never),
    ).toThrow(/cycle/i);
  });
});
