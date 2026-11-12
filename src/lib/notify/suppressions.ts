// Email addresses Duka must never email again: hard bounces and spam
// complaints reported by Resend (api/resend/webhook). Sending to dead or
// complaining addresses is what pushes a domain into spam folders.

import { query, queryOne } from "@/lib/db";

let ready = false;
async function ensureTable() {
  if (ready) return;
  await query(`
    CREATE TABLE IF NOT EXISTS email_suppressions (
      email      TEXT        PRIMARY KEY,
      reason     TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  ready = true;
}

const norm = (e: string) => e.trim().toLowerCase();

export async function isSuppressed(email: string): Promise<boolean> {
  try {
    await ensureTable();
    return !!(await queryOne("SELECT 1 FROM email_suppressions WHERE email = $1", [norm(email)]));
  } catch {
    return false; // never block mail because this check failed
  }
}

export async function suppress(email: string, reason: "bounced" | "complained"): Promise<void> {
  await ensureTable();
  await query(
    `INSERT INTO email_suppressions (email, reason) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason`,
    [norm(email), reason],
  );
}
