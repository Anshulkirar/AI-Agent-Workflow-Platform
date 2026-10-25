// Generic Postgres helpers. Schemas and migrations belong to the service that owns the data
// (e.g. apps/auth/migrations), so no service can reach another service's tables through here.
import pg from "pg";

export type Pool = pg.Pool;
export type PoolClient = pg.PoolClient;
/** Anything that can run a query: the pool itself, or a client inside a transaction. */
export type Queryable = pg.Pool | pg.PoolClient;

export type CreatePoolOptions = {
  max?: number;
  /** Called when an idle client errors (e.g. the database restarts). Without a listener Node would crash. */
  onError?: (error: Error) => void;
};

export function createPool(connectionString: string, options: CreatePoolOptions = {}): Pool {
  const pool = new pg.Pool({ connectionString, max: options.max ?? 10 });
  pool.on("error", options.onError ?? ((error) => console.error("[db] idle client error", error)));
  return pool;
}

/** Runs `work` in a transaction: COMMIT if it resolves, ROLLBACK if it throws. */
export async function withTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
