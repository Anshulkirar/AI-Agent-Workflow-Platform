import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password.js";
import { generateSessionToken, hashSessionToken, isWellFormedToken } from "../src/lib/tokens.js";

describe("password hashing", () => {
  it("uses Argon2id with the configured cost", async () => {
    expect(await hashPassword("analytical1")).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it("verifies the right password and rejects a wrong one", async () => {
    const stored = await hashPassword("analytical1");
    expect(await verifyPassword(stored, "analytical1")).toBe(true);
    expect(await verifyPassword(stored, "analytical2")).toBe(false);
  });

  it("salts every hash, so equal passwords give different hashes", async () => {
    expect(await hashPassword("same-password1")).not.toBe(await hashPassword("same-password1"));
  });

  it("treats a malformed stored hash as a mismatch instead of throwing", async () => {
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
  });
});

describe("session tokens", () => {
  it("generates unique 256-bit base64url tokens", () => {
    const a = generateSessionToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateSessionToken()).not.toBe(a);
  });

  it("hashes deterministically to 32 bytes", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toHaveLength(32);
    expect(hashSessionToken(token).equals(hashSessionToken(token))).toBe(true);
  });

  it("rejects malformed cookie values before they reach the database", () => {
    expect(isWellFormedToken(generateSessionToken())).toBe(true);
    expect(isWellFormedToken(undefined)).toBe(false);
    expect(isWellFormedToken("short")).toBe(false);
    expect(isWellFormedToken(`${"a".repeat(42)}!`)).toBe(false);
  });
});
