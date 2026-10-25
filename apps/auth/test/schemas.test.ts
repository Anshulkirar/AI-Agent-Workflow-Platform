import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "../src/modules/auth/auth.schemas.js";

describe("registerSchema", () => {
  it("normalizes email and name, and drops unknown fields", () => {
    const parsed = registerSchema.parse({
      name: "  Ada Lovelace ",
      email: "  Ada@Example.COM ",
      password: "analytical1",
      confirmPassword: "analytical1",
      isAdmin: true,
    });
    expect(parsed).toEqual({ name: "Ada Lovelace", email: "ada@example.com", password: "analytical1" });
  });

  it("enforces the signup password rules", () => {
    const messages = (password: string) =>
      registerSchema
        .safeParse({ name: "Ada", email: "ada@example.com", password })
        .error?.issues.map((issue) => issue.message);

    expect(messages("short1")).toContain("Use at least 8 characters.");
    expect(messages("onlyletters")).toContain("Include at least one number.");
    expect(messages("12345678")).toContain("Include at least one letter.");
    expect(messages(`a1${"x".repeat(127)}`)).toContain("Use at most 128 characters.");
  });
});

describe("loginSchema", () => {
  it("defaults remember to true and does not re-apply signup rules", () => {
    expect(loginSchema.parse({ email: "ADA@example.com", password: "x" })).toEqual({
      email: "ada@example.com",
      password: "x",
      remember: true,
    });
  });
});
