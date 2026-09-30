import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import * as schema from "./schema";

/**
 * Server-only PostgreSQL connection.
 *
 * The connection string is read from `DATABASE_URL` and never leaves the
 * server: this module imports `server-only`, so importing it from a Client
 * Component is a build error rather than a runtime credential leak.
 */

function readConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and set it before starting the app.",
    );
  }
  return url;
}

function sslOption(): { rejectUnauthorized: boolean } | undefined {
  const url = new URL(readConnectionString());
  const wantsSsl =
    process.env.DATABASE_SSL === "true" || url.searchParams.get("sslmode") === "require";
  // Supabase presents a certificate chain that is not in the local trust store,
  // so the channel is encrypted but the chain is not verified here. Traffic is
  // still TLS-protected; only the server identity check is relaxed.
  return wantsSsl ? { rejectUnauthorized: false } : undefined;
}

function createPool(): Pool {
  const pool = new Pool({
    connectionString: readConnectionString(),
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: sslOption(),
  });

  // An idle client can be dropped by the server or a firewall. Without a
  // listener that surfaces as an unhandled 'error' event and kills the process.
  pool.on("error", (error) => {
    console.error("[db] idle client error:", error.message);
  });

  return pool;
}

// Next.js reloads modules on every edit in development. Caching the pool on
// globalThis stops dev from leaking one connection pool per hot reload.
const globalForDb = globalThis as unknown as { __coreviaPool?: Pool };

export const pool: Pool = globalForDb.__coreviaPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__coreviaPool = pool;
}

export const db = drizzle(pool, { schema });

/** Runs `fn` inside a transaction, rolling back on any thrown error. */
export async function withTransaction<T>(fn: (tx: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Turns a Postgres error into something safe to show a user. Unique-violation
 * text from Postgres leaks table and column names, which is more detail than
 * the UI needs.
 */
export function describeDbError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    switch (code) {
      case "23505":
        return "A record with those details already exists.";
      case "23503":
        return "That record is still referenced by other data and cannot be changed.";
      case "23514":
        return "One of the values provided is not allowed.";
      case "ECONNREFUSED":
      case "ENOTFOUND":
      case "ETIMEDOUT":
        return "Could not reach the database. Check DATABASE_URL and that the server is running.";
      default:
        break;
    }
  }
  return "The database could not complete that request. Please try again.";
}
