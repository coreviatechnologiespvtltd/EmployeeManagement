import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * The canonical DDL is the hand-authored, readable SQL in
 * `supabase/migrations/`, applied by `npm run db:migrate`. That directory is
 * also the only place migrations live, so `drizzle-kit` is pointed at it: a
 * future `npm run db:generate` writes the next numbered file alongside the
 * first one, ready for `db:migrate` to apply.
 */
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});