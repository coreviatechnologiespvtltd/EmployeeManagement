import "server-only";

import bcrypt from "bcryptjs";

/**
 * Password hashing.
 *
 * Passwords are stored as bcrypt hashes with an embedded salt and cost factor.
 * Plaintext is never written to the database, logged, or returned by any query.
 * bcryptjs is a pure-JS implementation, so it installs without a native build
 * step; the algorithm is identical to the native `bcrypt` binding.
 */

/** 12 rounds is the current sensible default: ~250ms per hash on server hardware. */
const COST = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, COST);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  try {
    // bcrypt.compare is constant-time with respect to the hash contents.
    return await bcrypt.compare(plaintext, hash);
  } catch {
    // A malformed or truncated hash must read as "wrong password", never as a crash.
    return false;
  }
}
