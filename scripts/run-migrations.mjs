import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const require = createRequire(import.meta.url);
const { Client } = require("pg");

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load DATABASE_URL from .env if not already set
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(join(__dirname, "../.env"), "utf8");
    for (const line of env.split("\n")) {
      const match = line.match(/^DATABASE_URL=(.+)$/);
      if (match) { process.env.DATABASE_URL = match[1].trim(); break; }
    }
  } catch {}
}

// Ordered list — add new migrations at the bottom only
const MIGRATIONS = [
  { name: "admin-migration.sql",            path: join(__dirname, "admin-migration.sql") },
  { name: "visits-migration.sql",           path: join(__dirname, "visits-migration.sql") },
  { name: "plans-migration.sql",            path: join(__dirname, "plans-migration.sql") },
  { name: "storefront-migration.sql",       path: join(__dirname, "storefront-migration.sql") },
  { name: "features-migration.sql",         path: join(__dirname, "features-migration.sql") },
  { name: "payment-security-migration.sql", path: join(__dirname, "payment-security-migration.sql") },
  { name: "bank-accounts-migration.sql",    path: join(__dirname, "bank-accounts-migration.sql") },
  { name: "storefront-theme-migration.sql", path: join(__dirname, "storefront-theme-migration.sql") },
  { name: "add_reels.sql",                  path: join(__dirname, "../migrations/add_reels.sql") },
  { name: "bank-accounts-dedup.sql",        path: join(__dirname, "bank-accounts-dedup.sql") },
  { name: "orders-payment-method-fix.sql",  path: join(__dirname, "orders-payment-method-fix.sql") },
  { name: "affiliate-migration.sql",           path: join(__dirname, "affiliate-migration.sql") },
  { name: "affiliate-firebase-migration.sql",  path: join(__dirname, "affiliate-firebase-migration.sql") },
  { name: "plans-dedup-migration.sql",         path: join(__dirname, "plans-dedup-migration.sql") },
];

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  console.log("Connecting to database…");
  await client.connect();
  console.log("Connected.\n");

  // Create migration tracking table if it doesn't exist
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Fetch already-applied migrations
  const { rows } = await client.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  let ran = 0;
  let skipped = 0;

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) {
      console.log(`  skip  ${migration.name} (already applied)`);
      skipped++;
      continue;
    }

    process.stdout.write(`  run   ${migration.name} … `);
    try {
      const sql = readFileSync(migration.path, "utf8");
      // Run migration + record it atomically
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING",
        [migration.name]
      );
      await client.query("COMMIT");
      console.log("✓");
      ran++;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.log("✗ FAILED");
      console.error(`     ${err.message}\n`);
      // Don't exit — let remaining migrations attempt to run
    }
  }

  await client.end();
  console.log(`\nMigrations: ${ran} applied, ${skipped} skipped.`);
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
