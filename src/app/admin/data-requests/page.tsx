import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";
import { queryOne } from "@/lib/db";
import { listDeletionRequests, type AdminDeletionRow } from "@/lib/data-deletion";
import DataRequestsClient from "./DataRequestsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Data requests" };

/**
 * Stores whose row has no owner_email are found through the sign-in account
 * instead (Firebase email -> owner_id). Only for open requests, so it's cheap.
 */
async function matchBySignIn(rows: AdminDeletionRow[]): Promise<AdminDeletionRow[]> {
  const todo = rows.filter((r) => !r.store_id && r.email && (r.status === "received" || r.status === "in_progress")).slice(0, 25);
  if (!todo.length) return rows;
  const { adminAuth } = await import("@/lib/firebase-admin");
  await Promise.all(
    todo.map(async (r) => {
      try {
        const u = await adminAuth.getUserByEmail(r.email!);
        const s = await queryOne<{ id: string; name: string; slug: string; deleted_at: string | null }>(
          `SELECT id, name, slug, deleted_at FROM stores WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [u.uid],
        );
        if (s) Object.assign(r, { store_id: s.id, store_name_live: s.name, store_slug: s.slug, store_deleted: !!s.deleted_at });
      } catch {
        /* no sign-in account with that email */
      }
    }),
  );
  return rows;
}

export default async function DataRequestsPage() {
  const admin = await verifyAdminSession();
  if (!admin) redirect("/admin/login");
  const rows = await matchBySignIn(await listDeletionRequests());
  return <DataRequestsClient initial={JSON.parse(JSON.stringify(rows))} />;
}
