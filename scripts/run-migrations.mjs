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

const MIGRATIONS = [
  { name: "admin-migration.sql",    path: join(__dirname, "admin-migration.sql") },
  { name: "visits-migration.sql",   path: join(__dirname, "visits-migration.sql") },
  { name: "plans-migration.sql",    path: join(__dirname, "plans-migration.sql") },
  { name: "storefront-migration.sql", path: join(__dirname, "storefront-migration.sql") },
  { name: "features-migration.sql", path: join(__dirname, "features-migration.sql") },
  { name: "payment-security-migration.sql", path: join(__dirname, "payment-security-migration.sql") },
  { name: "bank-accounts-migration.sql",    path: join(__dirname, "bank-accounts-migration.sql") },
];

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  console.log("Connecting to database…");
  await client.connect();
  console.log("Connected.\n");

  for (const migration of MIGRATIONS) {
    process.stdout.write(`Running ${migration.name} … `);
    try {
      const sql = readFileSync(migration.path, "utf8");
      await client.query(sql);
      console.log("✓ done");
    } catch (err) {
      console.log("✗ FAILED");
      console.error(`  Error: ${err.message}\n`);
    }
  }

  await client.end();
  console.log("\nAll migrations complete.");
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
