import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { ROLE_HOME } from "@/lib/navigation";
import { db } from "@/lib/db/store";
import { createSession, destroySession, getSession } from "./session";
import type { AuthUser, LoginResult, Role } from "@/types/auth";
import type { Employee } from "@/types/employee";

function toAuthUser(employee: Employee): AuthUser {
  return {
    id: employee.id,
    username: employee.username,
    name: employee.fullName,
    email: employee.email,
    role: employee.role,
  };
}

/**
 * Mock credential check. A production implementation would call
 * `POST /api/auth/login` and receive a token plus the user profile.
 */
export async function authenticateCredentials(
  identifier: string,
  password: string,
): Promise<{ user?: AuthUser; error?: string }> {
  const normalized = identifier.trim().toLowerCase();

  const record = db.users.find(
    (u) => u.username.toLowerCase() === normalized || u.employee.email.toLowerCase() === normalized,
  );

  if (!record || record.password !== password) {
    return { error: "Invalid username or password. Please try again." };
  }

  const employee = db.employees.find((e) => e.id === record.userId);
  if (!employee) {
    return { error: "Account is not linked to an employee record." };
  }
  if (employee.status === "inactive") {
    return { error: "This account has been deactivated. Contact your administrator." };
  }

  return { user: toAuthUser(employee) };
}

export async function login(identifier: string, password: string): Promise<LoginResult> {
  const { user, error } = await authenticateCredentials(identifier, password);
  if (!user) return { success: false, error };

  const session = createSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: session.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor((session.expiresAt - Date.now()) / 1000),
  });

  return { success: true, user };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  destroySession(token);
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Reads the current user from the session cookie. Memoised per request so
 * repeated calls in a single render pass hit the session store once.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = getSession(token);
  if (!session) return null;

  const employee = db.employees.find((e) => e.id === session.userId);
  if (!employee || employee.status === "inactive") return null;

  return toAuthUser(employee);
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
