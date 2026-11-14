// A vendor's Google Search Console (and Merchant Center) site verification.
// They paste the "HTML tag" Google gives them; the store's pages then carry
// <meta name="google-site-verification" content="...">.

import { query } from "@/lib/db";

/**
 * Accepts the whole tag or just its content value. Returns the value,
 * "" to remove it, or null if it doesn't look like a Google code.
 */
export function parseVerification(input: string): string | null {
  const raw = input.trim();
  if (!raw) return "";
  const fromTag = raw.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
  if (/<meta/i.test(raw) && !/google-site-verification/i.test(raw)) return null;
  const value = (fromTag ?? raw).trim();
  return /^[A-Za-z0-9_-]{20,100}$/.test(value) ? value : null;
}

let columnReady = false;
/** Adds the column on first use, so this works before the migration has run. */
export async function ensureVerificationColumn() {
  if (columnReady) return;
  await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS google_site_verification TEXT`);
  columnReady = true;
}
