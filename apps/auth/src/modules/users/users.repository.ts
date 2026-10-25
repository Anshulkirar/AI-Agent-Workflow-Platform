import type { Queryable } from "@agentflow/db";
import type { PublicUser } from "@agentflow/types";

export type UserRow = { id: string; email: string; name: string; created_at: Date };

// Explicit column list: `SELECT *` would eventually leak password_hash somewhere.
const PUBLIC_COLUMNS = "id, email, name, created_at";

export function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at.toISOString() };
}

/** Returns null if the email is already registered (the unique index decides, so concurrent sign-ups are safe). */
export async function insertUser(
  db: Queryable,
  input: { email: string; name: string; passwordHash: string },
): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING ${PUBLIC_COLUMNS}`,
    [input.email, input.name, input.passwordHash],
  );
  return rows[0] ?? null;
}

/** The only query that reads password_hash — used by login and nothing else. */
export async function findUserCredentials(
  db: Queryable,
  email: string,
): Promise<(UserRow & { password_hash: string }) | null> {
  const { rows } = await db.query<UserRow & { password_hash: string }>(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}
