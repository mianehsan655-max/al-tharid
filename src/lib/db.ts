import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import postgres from "postgres";

// Share the pool across development reloads. Credentials stay on the server.
const globalDatabase = globalThis as typeof globalThis & {
  alTharidDatabase?: ReturnType<typeof postgres>;
};
const transactionContext = new AsyncLocalStorage<postgres.TransactionSql>();

export function database(): postgres.Sql | postgres.TransactionSql {
  const transaction = transactionContext.getStore();
  if (transaction) return transaction;

  if (!globalDatabase.alTharidDatabase) {
    const url = process.env.DATABASE_URL;
    if (!url)
      throw new Error(
        "DATABASE_URL is missing. Add it to your server environment.",
      );
    globalDatabase.alTharidDatabase = postgres(url, {
      ssl: "require",
      prepare: false, // Required by Supabase's transaction pooler.
      max: 3,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }
  return globalDatabase.alTharidDatabase;
}

/** Serialize restaurant mutations across all server instances, not just one process. */
export async function withDatabaseTransaction<T>(
  operation: () => Promise<T>,
): Promise<T> {
  if (transactionContext.getStore()) return operation();
  const pool = database() as postgres.Sql;
  const result = await pool.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(742901, 1)`;
    return transactionContext.run(transaction, operation);
  });
  return result as T;
}

export async function readState<T>(
  key: "site" | "business" | "checkout",
): Promise<T> {
  const rows =
    await database()`select data from al_tharid.state where key = ${key}`;
  if (!rows.length)
    throw new Error(
      "Database setup is incomplete. Run the database import script first.",
    );
  return rows[0].data as T;
}

// Call inside withDatabaseTransaction when changing existing data.
export async function writeState(
  key: "site" | "business" | "checkout",
  value: unknown,
): Promise<void> {
  await database()`
    insert into al_tharid.state (key, data)
    values (${key}, ${jsonParameter(value)}::jsonb)
    on conflict (key) do update set data = excluded.data, updated_at = now()
  `;
}

export function jsonParameter(value: unknown) {
  return database().json(value as postgres.JSONValue);
}
