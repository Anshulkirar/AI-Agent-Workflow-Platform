import { withTransaction, type Pool, type Queryable } from "@agentflow/db";
import type { PublicUser } from "@agentflow/types";
import type { Config } from "../../config.js";
import { AppError } from "../../errors.js";
import { getDummyHash, hashPassword, verifyPassword } from "../../lib/password.js";
import { generateSessionToken, hashSessionToken, isWellFormedToken } from "../../lib/tokens.js";
import type { IssuedSession } from "../sessions/session-cookie.js";
import { findActiveSession, insertSession, revokeSession } from "../sessions/sessions.repository.js";
import { findUserCredentials, insertUser, toPublicUser } from "../users/users.repository.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

/** Where a session was created from — stored for auditing, never used for authorization. */
export type SessionContext = { ip: string | null; userAgent: string | null };

export type Authenticated = { user: PublicUser; sessionId: string; expiresAt: Date };

/** Business rules for sign-up, sign-in and sessions. Knows nothing about HTTP. */
export function createAuthService(db: Pool, config: Config) {
  async function startSession(
    tx: Queryable,
    userId: string,
    persistent: boolean,
    context: SessionContext,
  ): Promise<IssuedSession> {
    const lifetimeSeconds = persistent
      ? config.SESSION_TTL_DAYS * 24 * 60 * 60
      : config.SESSION_SHORT_TTL_HOURS * 60 * 60;
    const token = generateSessionToken();

    const row = await insertSession(tx, { userId, tokenHash: hashSessionToken(token), lifetimeSeconds, ...context });
    // Only "remember me" sessions get a cookie lifetime; the others end when the browser closes.
    return { token, expiresAt: row.expires_at, maxAge: persistent ? lifetimeSeconds : undefined };
  }

  return {
    async register(input: RegisterInput, context: SessionContext) {
      // Hash before the transaction so a DB connection isn't held during the deliberately slow hashing.
      const passwordHash = await hashPassword(input.password);

      // User + first session commit together, or not at all.
      return withTransaction(db, async (tx) => {
        const row = await insertUser(tx, { email: input.email, name: input.name, passwordHash });
        if (!row) {
          throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists.", [
            { field: "email", message: "An account with this email already exists." },
          ]);
        }
        const session = await startSession(tx, row.id, true, context);
        return { user: toPublicUser(row), session };
      });
    },

    async login(input: LoginInput, previousToken: string | undefined, context: SessionContext) {
      const row = await findUserCredentials(db, input.email);
      const passwordOk = await verifyPassword(row?.password_hash ?? (await getDummyHash()), input.password);

      // Same error for "unknown email" and "wrong password", so the response can't confirm an account exists.
      if (!row || !passwordOk) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
      }

      // Signing in replaces this browser's previous session, so a planted or stale token stops working.
      if (isWellFormedToken(previousToken)) await revokeSession(db, hashSessionToken(previousToken));

      const session = await startSession(db, row.id, input.remember, context);
      return { user: toPublicUser(row), session };
    },

    async logout(token: string | undefined) {
      if (isWellFormedToken(token)) await revokeSession(db, hashSessionToken(token));
    },

    async authenticate(token: string | undefined): Promise<Authenticated | null> {
      if (!isWellFormedToken(token)) return null;
      const row = await findActiveSession(db, hashSessionToken(token));
      if (!row) return null;
      return { user: toPublicUser(row), sessionId: row.session_id, expiresAt: row.expires_at };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
