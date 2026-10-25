import { createHash, randomBytes } from "node:crypto";

// 32 random bytes = 256 bits of entropy, encoded as 43 base64url characters.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * The database stores only this hash. Plain SHA-256 is enough (unlike passwords) because the token
 * is already unguessable, and being deterministic lets us look a session up by its hash.
 */
export function hashSessionToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

/** Cheap shape check so junk cookie values never reach the database. */
export function isWellFormedToken(token: string | undefined): token is string {
  return token !== undefined && TOKEN_PATTERN.test(token);
}
