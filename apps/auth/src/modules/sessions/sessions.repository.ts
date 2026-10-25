import type { Queryable } from "@agentflow/db";
import type { UserRow } from "../users/users.repository.js";

export type ActiveSessionRow = UserRow & { session_id: string; expires_at: Date };

/** Expiry is computed by the database from its own clock, the same one that sets created_at. */
export async function insertSession(
  db: Queryable,
  input: { userId: string; tokenHash: Buffer; lifetimeSeconds: number; ip: string | null; userAgent: string | null },
): Promise<{ id: string; expires_at: Date }> {
  const { rows } = await db.query<{ id: string; expires_at: Date }>(
    `INSERT INTO sessions (user_id, token_hash, expires_at, ip, user_agent)
     VALUES ($1, $2, now() + make_interval(secs => $3), $4, $5)
     RETURNING id, expires_at`,
    [input.userId, input.tokenHash, input.lifetimeSeconds, input.ip, input.userAgent],
  );
  return rows[0]!;
}

/** A session counts only if it exists, was not revoked, and has not expired — checked in one query. */
export async function findActiveSession(db: Queryable, tokenHash: Buffer): Promise<ActiveSessionRow | null> {
  const { rows } = await db.query<ActiveSessionRow>(
    `SELECT s.id AS session_id, s.expires_at, u.id, u.email, u.name, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function revokeSession(db: Queryable, tokenHash: Buffer): Promise<void> {
  await db.query(
    `UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
}

/** Housekeeping: drops sessions that expired or were revoked more than `retentionDays` ago. */
export async function deleteStaleSessions(db: Queryable, retentionDays: number): Promise<number> {
  const { rowCount } = await db.query(
    `DELETE FROM sessions
     WHERE expires_at < now() - make_interval(days => $1)
        OR revoked_at < now() - make_interval(days => $1)`,
    [retentionDays],
  );
  return rowCount ?? 0;
}
