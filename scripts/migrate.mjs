/**
 * Applies every `.sql` file in `supabase/migrations/` in filename order.
 *
 * Applied files are recorded in a `schema_migrations` table, so running this
 * twice is a no-op and only new files are executed. Each file runs inside its
 * own transaction: a failure leaves the database on the last good migration.
 *
 * The same files work with `supabase db push` and with psql, so this script is
 * a convenience rather than a requirement.
 *
 *   npm run db:migrate
 */

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Client } from "pg";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(projectRoot, "supabase", "migrations");

config({ path: join(projectRoot, ".env"), quiet: true });

function requireConnectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set.\n" +
        "Copy .env.example to .env and fill in your PostgreSQL connection string.",
    );
  }
  return url;
}

async function main() {
  const client = new Client({ connectionString: requireConnectionString() });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("No migrations found in supabase/migrations.");
      return;
    }

    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.name));

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip  ${file}`);
        continue;
      }

      const sql = await readFile(join(migrationsDir, file), "utf8");
      console.log(`  apply ${file}`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        ran++;
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${error.message}`);
      }
    }

    console.log(
      ran === 0
        ? "Database is already up to date."
        : `Applied ${ran} migration${ran === 1 ? "" : "s"}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`\ndb:migrate failed — ${error.message}\n`);
  process.exitCode = 1;
});