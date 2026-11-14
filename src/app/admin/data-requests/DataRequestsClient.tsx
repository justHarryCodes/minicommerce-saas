"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowUpRight, CheckCircle, Clock, Loader2, Play, ShieldCheck, Store, Trash2, XCircle } from "lucide-react";
import type { AdminDeletionRow, DeletionStatus } from "@/lib/data-deletion";

type Action = "start" | "delete_store" | "complete" | "reject";

const BADGE: Record<DeletionStatus, { label: string; cls: string }> = {
  received: { label: "New", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  in_progress: { label: "In progress", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  completed: { label: "Completed", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const WHO: Record<string, string> = { vendor: "Vendor", customer: "Shopper", other: "Other" };

const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const daysOld = (s: string) => Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000);

const btn = "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50";

export default function DataRequestsClient({ initial }: { initial: AdminDeletionRow[] }) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<"open" | "all">("open");
  const [acting, setActing] = useState<string | null>(null);

  const open = rows.filter((r) => r.status === "received" || r.status === "in_progress");
  const shown = tab === "open" ? open : rows;

  async function act(r: AdminDeletionRow, action: Action) {
    let note: string | undefined;
    if (action === "delete_store") {
      const typed = prompt(
        `This permanently deletes "${r.store_name_live}" (${r.store_slug}): its details, bank info and the owner's sign-in. Orders are kept.\n\nOnly do this once you've confirmed the request is really from the owner.\n\nType the store link name to confirm:`,
      );
      if (typed === null) return;
      if (typed.trim() !== r.store_slug) return toast.error("That doesn't match the store link name");
    }
    if (action === "complete" && !confirm(`Mark ${r.code} as completed? ${r.email ? "They'll get an email saying their data was deleted." : ""}`)) return;
    if (action === "reject") {
      const reason = prompt("Why? This is emailed to them, e.g. \"We couldn't confirm you own this store. Please email us from your sign-in email.\"");
      if (!reason?.trim()) return;
      note = reason.trim();
    }

    setActing(r.code);
    try {
      const res = await fetch(`/api/admin/data-requests/${r.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, storeId: action === "delete_store" ? r.store_id : undefined, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRows((prev) =>
        prev.map((x) =>
          x.code === r.code
            ? {
                ...x,
                status: data.status,
                completed_at: data.status === "completed" ? new Date().toISOString() : x.completed_at,
                store_deleted: action === "delete_store" ? true : x.store_deleted,
                admin_note: note ?? (action === "delete_store" ? `Deleted store ${r.store_slug}` : x.admin_note),
              }
            : x,
        ),
      );
      toast.success(
        action === "start" ? "Marked in progress" : action === "reject" ? "Rejected and emailed" : action === "delete_store" ? "Store deleted and request completed" : "Completed",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Data requests</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            People asking to delete their data, from{" "}
            <Link href="/data-deletion" target="_blank" className="underline">dukanigeria.com/data-deletion</Link> or by removing Duka on Facebook. Finish within 30 days.
          </p>
        </div>
        {open.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            <Clock className="w-4 h-4" /> {open.length} open
          </span>
        )}
      </div>

      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
        {([["open", `Open (${open.length})`], ["all", "All"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-16 text-center">
          <ShieldCheck className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="font-semibold text-zinc-900 dark:text-white mb-1">{tab === "open" ? "Nothing waiting" : "No requests yet"}</p>
          <p className="text-sm text-zinc-400">New requests also arrive by email and admin notification.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {shown.map((r) => {
            const badge = BADGE[r.status] ?? BADGE.received;
            const isOpen = r.status === "received" || r.status === "in_progress";
            const age = daysOld(r.created_at);
            const busy = acting === r.code;
            const canDeleteStore = isOpen && r.store_id && !r.store_deleted;
            return (
              <div key={r.code} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">{r.code}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.cls}`}>{badge.label}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {r.source === "meta" ? "Facebook removal" : WHO[r.role ?? "other"]}
                  </span>
                  {isOpen && age >= 21 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{age} days old</span>
                  )}
                  <span className="ml-auto text-xs text-zinc-400">{fmtDate(r.created_at)}</span>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  {r.email && (<><dt className="text-zinc-400">Email</dt><dd className="text-zinc-900 dark:text-white break-all"><a href={`mailto:${r.email}?subject=${encodeURIComponent(`Your data deletion request ${r.code}`)}`} className="underline">{r.email}</a></dd></>)}
                  {r.phone && (<><dt className="text-zinc-400">Phone</dt><dd className="text-zinc-900 dark:text-white">{r.phone}</dd></>)}
                  {r.store_name && (<><dt className="text-zinc-400">They said</dt><dd className="text-zinc-900 dark:text-white break-words">{r.store_name}</dd></>)}
                  {r.meta_user_id && (<><dt className="text-zinc-400">Meta user</dt><dd className="font-mono text-xs text-zinc-600 dark:text-zinc-300 break-all">{r.meta_user_id}</dd></>)}
                  {r.details && (<><dt className="text-zinc-400">Details</dt><dd className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">{r.details}</dd></>)}
                </dl>

                {r.store_id ? (
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${r.store_deleted ? "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500" : "bg-amber-50 dark:bg-amber-950/20 text-zinc-800 dark:text-zinc-200"}`}>
                    <Store className="w-4 h-4 shrink-0" />
                    <span className="min-w-0">
                      {r.store_deleted ? "Store already deleted: " : "Their sign-in email owns "}
                      <strong>{r.store_name_live}</strong> <span className="text-zinc-400">({r.store_slug})</span>
                    </span>
                    {!r.store_deleted && (
                      <Link href={`/admin/vendors/${r.store_id}`} className="ml-auto shrink-0 text-zinc-400 hover:text-zinc-700" aria-label="Open vendor">
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                ) : (
                  r.source !== "meta" && r.role === "vendor" && isOpen && (
                    <p className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-500">
                      No store uses this email. Reply and ask them to write from their sign-in email, or find the store in Vendors.
                    </p>
                  )
                )}

                {r.admin_note && <p className="text-xs text-zinc-500"><span className="font-semibold">Note:</span> {r.admin_note}{r.handled_by ? ` · ${r.handled_by}` : ""}</p>}

                {isOpen && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {r.status === "received" && (
                      <button onClick={() => act(r, "start")} disabled={busy} className={`${btn} bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400`}>
                        <Play className="w-3.5 h-3.5" /> Start
                      </button>
                    )}
                    {canDeleteStore && (
                      <button onClick={() => act(r, "delete_store")} disabled={busy} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete store data &amp; complete
                      </button>
                    )}
                    <button onClick={() => act(r, "complete")} disabled={busy} className={`${btn} bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400`}>
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Mark completed
                    </button>
                    <button onClick={() => act(r, "reject")} disabled={busy} className={`${btn} bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400`}>
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
