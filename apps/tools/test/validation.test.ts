import { describe, expect, it } from "vitest";
import { toolInputSchema } from "../src/modules/tools/tools.schemas.js";

describe("tool integration validation", () => {
  it("accepts a custom tool configuration", () => {
    const tool = toolInputSchema.parse({
      definitionKey: "http",
      name: "Internal API",
      credentials: { apiKey: "secret" },
      inputSchema: { type: "object" },
    });
    expect(tool.outputSchema).toEqual({});
  });
  it("rejects an empty tool name", () => {
    expect(() =>
      toolInputSchema.parse({
        definitionKey: "http",
        name: "",
        credentials: {},
      }),
    ).toThrow();
  });
});
