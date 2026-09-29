import { SESSION_TTL_MS } from "@/lib/constants";
import type { Session } from "@/types/auth";

/**
 * Mock session store.
 *
 * Sessions live in-process and are keyed by an opaque random token that is
 * written to an httpOnly cookie. Replacing this with a real backend means
 * swapping the map for a database table or a token introspection call — the
 * four functions below are the entire surface used by the rest of the app.
 */

const globalForSessions = globalThis as unknown as {
  __coreviaSessions?: Map<string, Session>;
};

const sessions: Map<string, Session> =
  globalForSessions.__coreviaSessions ?? new Map<string, Session>();

if (process.env.NODE_ENV !== "production") {
  globalForSessions.__coreviaSessions = sessions;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createSession(userId: string): Session {
  const now = Date.now();
  const session: Session = {
    token: generateToken(),
    userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  sessions.set(session.token, session);
  return session;
}

export function getSession(token: string | undefined): Session | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function destroySession(token: string | undefined): void {
  if (!token) return;
  sessions.delete(token);
}

export function destroyAllSessionsForUser(userId: string): void {
  for (const [token, session] of sessions) {
    if (session.userId === userId) sessions.delete(token);
  }
}
