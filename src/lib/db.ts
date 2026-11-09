import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

// Share the pool across development reloads. Credentials stay on the server.
const globalDatabase = globalThis as typeof globalThis & {
  alTharidDatabase?: ReturnType<typeof postgres>;
  alTharidLocalQueue?: Promise<unknown>;
};
const transactionContext = new AsyncLocalStorage<postgres.TransactionSql>();

/**
 * Use local JSON files during local development by default so local testing,
 * menu experiments, loyalty signups, and reviews never mutate the live
 * production Supabase database until explicitly enabled or deployed.
 */
export function useLocalStorageMode(): boolean {
  if (process.env.USE_SUPABASE_LOCAL === "true") return false;
  if (process.env.NODE_ENV !== "production") return true;
  return !process.env.DATABASE_URL;
}

const dataDir = path.join(process.cwd(), "data");

const stateFilenames: Record<"site" | "business" | "checkout", string> = {
  site: "site.json",
  business: "business.json",
  checkout: "checkout-settings.json",
};

const defaultStates: Record<"site" | "business" | "checkout", unknown> = {
  site: { settings: {}, items: [] },
  business: { version: 1, costs: {}, costHistory: [], expenses: [] },
  checkout: {
    orderingEnabled: true,
    pickupEnabled: true,
    deliveryEnabled: true,
    deliveryCity: "Jaranwala",
    deliveryFee: 100,
    freeDeliveryThreshold: 500,
    minimumDeliverySubtotal: 0,
    pickupEstimateMinutes: 25,
  },
};

export async function readLocalJson<T>(
  relativePath: string,
  fallback?: T,
): Promise<T> {
  const fullPath = path.join(dataDir, relativePath);
  try {
    const raw = await fs.readFile(fullPath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT" && fallback !== undefined) {
      return structuredClone(fallback);
    }
    throw error;
  }
}

export async function writeLocalJson(
  relativePath: string,
  value: unknown,
): Promise<void> {
  const fullPath = path.join(dataDir, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const tempPath = `${fullPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tempPath, fullPath);
}

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

/** Serialize restaurant mutations across all server instances or local operations. */
export async function withDatabaseTransaction<T>(
  operation: () => Promise<T>,
): Promise<T> {
  if (useLocalStorageMode()) {
    const previous = globalDatabase.alTharidLocalQueue ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(() => operation());
    globalDatabase.alTharidLocalQueue = next;
    return next;
  }

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
  if (useLocalStorageMode()) {
    return readLocalJson<T>(stateFilenames[key], defaultStates[key] as T);
  }
  try {
    const rows =
      await database()`select data from al_tharid.state where key = ${key}`;
    if (!rows.length) {
      return readLocalJson<T>(stateFilenames[key], defaultStates[key] as T);
    }
    return rows[0].data as T;
  } catch {
    return readLocalJson<T>(stateFilenames[key], defaultStates[key] as T);
  }
}

// Call inside withDatabaseTransaction when changing existing data.
export async function writeState(
  key: "site" | "business" | "checkout",
  value: unknown,
): Promise<void> {
  if (useLocalStorageMode()) {
    await writeLocalJson(stateFilenames[key], value);
    return;
  }
  await database()`
    insert into al_tharid.state (key, data)
    values (${key}, ${jsonParameter(value)}::jsonb)
    on conflict (key) do update set data = excluded.data, updated_at = now()
  `;
}

export function jsonParameter(value: unknown) {
  return database().json(value as postgres.JSONValue);
}
