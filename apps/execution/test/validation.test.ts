import { describe, expect, it } from "vitest";
import { createRunSchema } from "../src/modules/runs/runs.schemas.js";
import { ZodError } from "zod";

describe("execution run validation", () => {
  it("accepts a valid run", () => {
    const run = createRunSchema.parse({
      sourceType: "agent",
      sourceId: "00000000-0000-4000-8000-000000000001",
      input: { prompt: "hello" },
    });
    expect(run.timeoutMs).toBe(300000);
    expect(run.maxAttempts).toBe(1);
  });

  it("rejects an invalid source id", () => {
    expect(() =>
      createRunSchema.parse({
        sourceType: "agent",
        sourceId: "bad",
        input: {},
      }),
    ).toThrow(ZodError);
  });
});
