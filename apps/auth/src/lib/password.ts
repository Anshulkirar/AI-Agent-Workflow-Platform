import { hash, verify } from "@node-rs/argon2";

// Argon2id (the library default) at OWASP's minimum: 19 MiB memory, 2 passes, 1 thread.
// Raising these later is safe — each hash stores its own parameters, so old hashes still verify.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // A malformed stored hash must read as "wrong password", never as a 500.
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * A real hash of a throwaway password. Login verifies against it when the email is unknown,
 * so "no such user" takes as long as "wrong password" and response time can't reveal which emails exist.
 */
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("dummy-password-for-timing-safety");
  return dummyHash;
}
