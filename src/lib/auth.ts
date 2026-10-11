// ─── Auth helpers (server) ────────────────────────────────────────
// Single-company mode: there is exactly one `stores` row (the company
// profile, seeded by migrations/002_company_pivot.sql). Public pages
// read it via getCompany(); dashboard routes resolve the logged-in
// Firebase user to that same row via getUserStore().
//
// IMPORTANT: customer self-signup exists (see /account/signup) — this
// project's Firebase auth now has BOTH regular customers and staff in
// it, sharing the same `session` cookie. Dashboard/admin access is
// gated separately by ADMIN_EMAILS (see isAdminEmail below), checked
// inside getUserStore() itself so every existing dashboard page/API
// route that already calls verifySession() + getUserStore() is
// protected automatically, with no per-call-site changes needed.
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth } from "./firebase-admin";
import { queryOne, query, toCamel } from "./db";
import type { Store, Customer } from "@/types";

const COMPANY_SLUG = process.env.COMPANY_STORE_SLUG ?? "forge-and-form";

const SESSION_COOKIE = "session";

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase());
}

export interface SessionUser {
  firebaseUid: string;
  email: string;
  displayName?: string;
}

// Verify session cookie OR Bearer token (mobile app) → returns SessionUser or null
export async function verifySession(): Promise<SessionUser | null> {
  // 1. Try session cookie (web dashboard)
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
    if (sessionCookie) {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      return {
        firebaseUid: decoded.uid,
        email: decoded.email ?? "",
        displayName: decoded.name,
      };
    }
  } catch {}

  // 2. Try Bearer token (mobile app)
  try {
    const headerStore = await headers();
    const auth =
      headerStore.get("authorization") ?? headerStore.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const idToken = auth.slice(7);
      const decoded = await adminAuth.verifyIdToken(idToken);
      return {
        firebaseUid: decoded.uid,
        email: decoded.email ?? "",
        displayName: decoded.name,
      };
    }
  } catch {}

  return null;
}

// Public: fetch the single company profile row. No auth required — used
// by every public marketing/catalog page.
export async function getCompany(): Promise<Store | null> {
  const row = await queryOne(
    "SELECT * FROM stores WHERE slug = $1 AND is_active = true",
    [COMPANY_SLUG],
  );
  if (!row) return null;
  return toCamel<Store>(row as Record<string, unknown>);
}

// Dashboard: resolve the logged-in Firebase user to the one company row —
// but ONLY if their email is on the ADMIN_EMAILS allow-list. Returns null
// (same as "not logged in") for any other authenticated user, e.g. a
// regular customer — every dashboard page/API route already treats a
// null store as "unauthorized", so this is enforced everywhere for free.
// `firebaseUid` is accepted but unused — kept so the existing call-site
// signature (`getUserStore(user.firebaseUid)`) stays stable; the email
// check is done via a fresh verifySession() rather than trusting a
// passed-in email, since call sites were written before this existed.
export async function getUserStore(firebaseUid: string): Promise<Store | null> {
  void firebaseUid;
  const session = await verifySession();
  if (!session || !isAdminEmail(session.email)) return null;
  return getCompany();
}

// Customer accounts (buyers) — any authenticated user who is NOT an admin
// is treated as a customer. First call after login upserts their row
// (seeded with Firebase's name/email); later calls just touch updated_at,
// never clobbering profile fields the customer has since edited.
export async function getOrCreateCustomer(
  session: SessionUser,
): Promise<Customer | null> {
  const company = await getCompany();
  if (!company) return null;

  const rows = await query(
    `INSERT INTO customers (store_id, firebase_uid, name, email)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (store_id, firebase_uid) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [
      company.id,
      session.firebaseUid,
      session.displayName || null,
      session.email || null,
    ],
  );
  return toCamel<Customer>(rows[0] as Record<string, unknown>);
}

// Create session cookie from ID token
export async function createSessionCookie(idToken: string): Promise<string> {
  const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
  return adminAuth.createSessionCookie(idToken, { expiresIn });
}

// Resolve the current session to a customer row (creating it on first use).
// Returns null for guests. Use in server components and API routes.
export async function getCurrentCustomer(): Promise<{
  customer: Customer;
  session: SessionUser;
} | null> {
  const session = await verifySession();
  if (!session) return null;
  const customer = await getOrCreateCustomer(session);
  if (!customer) return null;
  return { customer, session };
}

// No-op in single-company mode — there's no per-vendor subscription/setup
// fee anymore. Kept as a pass-through so existing call sites don't need
// to be touched.
export async function requireSubscription(
  _store: Store,
): Promise<NextResponse | null> {
  void _store;
  return null;
}
