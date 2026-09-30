import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq, or, sql } from "drizzle-orm";
import { db, describeDbError } from "@/lib/db/client";
import { employees, userCredentials } from "@/lib/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { ROLE_HOME } from "@/lib/navigation";
import { verifyPassword } from "./password";
import { createSession, destroyAllSessionsForUser, destroySession, getSession } from "./session";
import type { AuthUser, LoginResult, Role } from "@/types/auth";

/**
 * Credential verification and session handling.
 *
 * Everything here is answered by PostgreSQL:
 *  - the account is found by username *or* email, case-insensitively;
 *  - the password is checked against the bcrypt hash in `user_credentials`;
 *  - the role that gates every page and action is read from `employees.role`;
 *  - the session is a row in `sessions`.
 *
 * There is no hardcoded account and no plaintext comparison anywhere.
 */

/** Consecutive failures before the account is temporarily locked. */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

/** One message for every failure mode, so the form cannot be used to probe usernames. */
const GENERIC_FAILURE = "Invalid username or password. Please try again.";

export async function authenticateCredentials(
  identifier: string,
  password: string,
): Promise<{ user?: AuthUser; error?: string }> {
  const normalized = identifier.trim().toLowerCase();

  const rows = await db
    .select({
      id: employees.id,
      username: employees.username,
      fullName: employees.fullName,
      email: employees.email,
      role: employees.role,
      status: employees.status,
      passwordHash: userCredentials.passwordHash,
      failedAttempts: userCredentials.failedAttempts,
      lockedUntil: userCredentials.lockedUntil,
    })
    .from(employees)
    .innerJoin(userCredentials, eq(userCredentials.employeeId, employees.id))
    .where(
      or(
        sql`lower(${employees.username}) = ${normalized}`,
        sql`lower(${employees.email}) = ${normalized}`,
      ),
    )
    .limit(1);

  const record = rows[0];
  if (!record) {
    // Still spend time on a hash comparison so that a missing account and a
    // wrong password take roughly the same wall-clock time.
    await verifyPassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    return { error: GENERIC_FAILURE };
  }

  if (record.lockedUntil && new Date(record.lockedUntil).getTime() > Date.now()) {
    return { error: "This account is temporarily locked after too many failed attempts. Try again shortly." };
  }

  const valid = await verifyPassword(password, record.passwordHash);

  if (!valid) {
    const attempts = record.failedAttempts + 1;
    await db
      .update(userCredentials)
      .set({
        failedAttempts: attempts,
        lockedUntil:
          attempts >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MS).toISOString()
            : record.lockedUntil,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userCredentials.employeeId, record.id));
    return { error: GENERIC_FAILURE };
  }

  if (record.status === "inactive") {
    return { error: "This account has been deactivated. Contact your administrator." };
  }

  // Successful sign-in clears the failure counter and any active lockout.
  await db
    .update(userCredentials)
    .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date().toISOString() })
    .where(eq(userCredentials.employeeId, record.id));

  return {
    user: {
      id: record.id,
      username: record.username,
      name: record.fullName,
      email: record.email,
      role: record.role,
    },
  };
}

export async function login(identifier: string, password: string): Promise<LoginResult> {
  let result: Awaited<ReturnType<typeof authenticateCredentials>>;
  try {
    result = await authenticateCredentials(identifier, password);
  } catch (error) {
    console.error("[auth] sign-in failed:", error);
    return { success: false, error: describeDbError(error) };
  }

  const { user, error } = result;
  if (!user) return { success: false, error };

  const session = await createSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: session.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(1, Math.floor((session.expiresAt - Date.now()) / 1000)),
  });

  return { success: true, user };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  await destroySession(token);
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Reads the current user from the session cookie, then re-reads the employee
 * row. The role is always the current database value, so a role change takes
 * effect on the next request instead of at the next sign-in.
 *
 * Memoised per request so repeated calls in one render pass hit the database once.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await getSession(token);
  if (!session) return null;

  const rows = await db
    .select({
      id: employees.id,
      username: employees.username,
      fullName: employees.fullName,
      email: employees.email,
      role: employees.role,
      status: employees.status,
    })
    .from(employees)
    .where(eq(employees.id, session.userId))
    .limit(1);

  const row = rows[0];
  if (!row || row.status === "inactive") return null;

  return {
    id: row.id,
    username: row.username,
    name: row.fullName,
    email: row.email,
    role: row.role,
  };
});

export async function getUserRole(): Promise<Role | null> {
  const user = await getCurrentUser();
  return user?.role ?? null;
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}

/** Server Components: redirect to /login when unauthenticated. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Server Components: redirect to the caller's own home or /unauthorized. */
export async function requireRole(role: Role): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect("/unauthorized");
  return user;
}

export async function dashboardPathFor(role: Role): Promise<string> {
  return ROLE_HOME[role];
}

export { destroyAllSessionsForUser };
