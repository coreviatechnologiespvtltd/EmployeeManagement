import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions } from "@/lib/db/schema";
import { SESSION_TTL_MS } from "@/lib/constants";
import type { Session } from "@/types/auth";

/**
 * Database-backed session store.
 *
 * The surface is deliberately the same four functions the mock exposed, so
 * nothing above this file had to change. What changed is where the state lives:
 * a `sessions` table instead of a `Map`, which means sessions now survive a
 * server restart and work across multiple instances.
 *
 * Only `sha256(token)` is stored. The raw 256-bit token exists solely in the
 * httpOnly cookie, so a dump of the `sessions` table cannot be replayed as a
 * live login. The hash is not a password hash: the token is already 32 bytes
 * of CSPRNG output, so there is nothing to brute-force and no need to be slow.
 */

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<Session> {
  const now = Date.now();
  const session: Session = {
    token: generateToken(),
    userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };

  await db.insert(sessions).values({
    tokenHash: hashToken(session.token),
    employeeId: userId,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });

  return session;
}

export async function getSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;

  const tokenHash = hashToken(token);
  const rows = await db
    .select({
      employeeId: sessions.employeeId,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const expiresAt = new Date(row.expiresAt).getTime();
  if (expiresAt < Date.now()) {
    // Opportunistic cleanup: an expired row can never authenticate anyone.
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    return null;
  }

  return {
    token,
    userId: row.employeeId,
    createdAt: new Date(row.createdAt).getTime(),
    expiresAt,
  };
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/**
 * Invalidates every session for a user. Called when a role changes, an account
 * is deactivated, or a staff member is deleted, so that privileges can never
 * outlive the change that removed them.
 */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.employeeId, userId));
}

/** Housekeeping helper, safe to call on boot or from a scheduled job. */
export async function purgeExpiredSessions(): Promise<number> {
  const deleted = await db
    .delete(sessions)
    .where(and(lt(sessions.expiresAt, new Date().toISOString())))
    .returning({ tokenHash: sessions.tokenHash });
  return deleted.length;
}
