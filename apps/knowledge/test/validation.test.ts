import { describe, expect, it } from "vitest";
import { sourcePatchSchema, textSourceSchema, urlSourceSchema } from "../src/modules/sources/sources.schemas.js";

describe("knowledge source validation", () => {
  it("accepts a text source", () => {
    expect(textSourceSchema.parse({ type: "text", name: "FAQ", text: "Hello", collectionId: "support" }).tags).toEqual([]);
  });
  it("accepts a valid URL", () => {
    expect(urlSourceSchema.parse({ type: "url", name: "Docs", url: "https://example.com/docs", collectionId: "docs" }).url).toBe("https://example.com/docs");
  });
  it("rejects an invalid source patch", () => {
    expect(() => sourcePatchSchema.parse({ syncSchedule: "hourly" })).toThrow();
  });
});
