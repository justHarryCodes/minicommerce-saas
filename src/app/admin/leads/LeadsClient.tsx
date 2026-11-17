"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowUpRight, Mail, Megaphone, MessageCircle, Search, StickyNote } from "lucide-react";
import type { LeadStatus, UnfinishedLead, UpgradeLead } from "@/lib/admin/leads";

// Admin -> Leads: unfinished sign-ups to activate, and Free stores that are
// already selling to upgrade. Pick leads and turn them into a campaign.

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  contacted: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  converted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  lost: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};
const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
};
const waLink = (phone: string | null) => {
  const d = (phone ?? "").replace(/\D/g, "");
  if (!d) return null;
  return `https://wa.me/${d.startsWith("0") ? `234${d.slice(1)}` : d}`;
};

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="mt-1 text-2xl font-black" style={{ color: "var(--text-primary)" }}>{value}</p>
      {hint && <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

function StatusPicker({ value, onChange }: { value: LeadStatus; onChange: (s: LeadStatus) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as LeadStatus)}
      aria-label="Lead status"
      className={`cursor-pointer rounded-full border-0 py-0.5 pl-2 pr-6 text-[11px] font-bold capitalize ${STATUS_STYLE[value]}`}
    >
      {(["new", "contacted", "converted", "lost"] as LeadStatus[]).map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

export default function LeadsClient({ initialTab, unfinished, upgrade }: { initialTab: "unfinished" | "upgrade"; unfinished: UnfinishedLead[]; upgrade: UpgradeLead[] }) {
  const [tab, setTab] = useState(initialTab);
  const [u1, setU1] = useState(unfinished);
  const [u2, setU2] = useState(upgrade);
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"open" | LeadStatus | "all">("open");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  async function update(key: string, patch: { status?: LeadStatus; note?: string | null }) {
    const apply = <T extends { key: string; status: LeadStatus; note: string | null }>(list: T[]) => list.map((l) => (l.key === key ? { ...l, ...patch } : l));
    setU1((l) => apply(l));
    setU2((l) => apply(l));
    const res = await fetch("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, ...patch }) }).catch(() => null);
    if (!res?.ok) toast.error("Couldn't save");
  }
  const note = (key: string, current: string | null) => {
    const n = prompt("Note for this lead (who you spoke to, what they said, next step):", current ?? "");
    if (n !== null) update(key, { note: n.trim() || null, ...(n.trim() ? { status: "contacted" } : {}) });
  };

  const list = tab === "unfinished" ? u1 : u2;
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (list as (UnfinishedLead | UpgradeLead)[]).filter(
      (l) =>
        (show === "all" || (show === "open" ? l.status === "new" || l.status === "contacted" : l.status === show)) &&
        (!t || `${l.name} ${l.email ?? ""} ${l.phone ?? ""} ${l.category ?? ""}`.toLowerCase().includes(t)),
    );
  }, [list, q, show]);

  const storeIds = [...picked].map((k) => k.split(":")[1]).filter((id, _, arr) => !!id && arr.length > 0);
  const pickable = shown.filter((l) => l.storeId);
  const allPicked = pickable.length > 0 && pickable.every((l) => picked.has(l.key));
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(pickable.map((l) => l.key)));
  const toggle = (k: string) => setPicked((p) => {
    const n = new Set(p);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
  });

  const kpis =
    tab === "unfinished"
      ? [
          { label: "Unfinished", value: u1.length, hint: "stores + sign-ups" },
          { label: "No store yet", value: u1.filter((l) => !l.storeId).length, hint: "signed up, last 60 days" },
          { label: "No products", value: u1.filter((l) => l.storeId && l.products === 0).length },
          { label: "Converted", value: u1.filter((l) => l.status === "converted").length },
        ]
      : [
          { label: "Prospects", value: u2.length, hint: "Free / lapsed, selling" },
          { label: "Hot (score 60+)", value: u2.filter((l) => l.score >= 60).length },
          { label: "Their sales · 30d", value: naira(u2.reduce((s, l) => s + l.revenue30, 0)) },
          { label: "Converted", value: u2.filter((l) => l.status === "converted").length },
        ];

  const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex rounded-lg p-0.5" style={{ background: "var(--bg-tertiary)" }}>
          {([["unfinished", `Unfinished sign-ups (${u1.length})`], ["upgrade", `Upgrade prospects (${u2.length})`]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => (setTab(k), setPicked(new Set()))} className={`rounded-md px-3 py-1.5 text-[13px] font-semibold ${tab === k ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white" : "text-zinc-500"}`}>
              {l}
            </button>
          ))}
        </div>
        {picked.size > 0 && (
          <Link href={`/admin/campaigns/new?stores=${storeIds.join(",")}&from=${tab}`} className={`${btn} bg-amber-400 text-black hover:bg-amber-500`}>
            <Megaphone className="h-4 w-4" /> Campaign to {picked.size} selected
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {kpis.map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone, category" className="h-9 w-full rounded-lg border pl-8 pr-3 text-[13px] outline-none" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
        </div>
        {(["open", "new", "contacted", "converted", "lost", "all"] as const).map((s) => (
          <button key={s} onClick={() => setShow(s)} className={`rounded-full px-3 py-1 text-[12px] font-semibold capitalize ${show === s ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
            {s === "open" ? "Open" : s}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                <th className="w-8 px-3 py-2"><input type="checkbox" checked={allPicked} onChange={toggleAll} aria-label="Select all" /></th>
                <th className="px-3 py-2 font-medium">Lead</th>
                {tab === "unfinished" ? (
                  <>
                    <th className="px-3 py-2 font-medium">What&apos;s missing</th>
                    <th className="hidden px-3 py-2 font-medium md:table-cell">Joined</th>
                    <th className="hidden px-3 py-2 font-medium lg:table-cell">Last reminder</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2 font-medium">Score</th>
                    <th className="px-3 py-2 text-right font-medium">Sales · 30d</th>
                    <th className="hidden px-3 py-2 font-medium md:table-cell">Products</th>
                    <th className="hidden px-3 py-2 font-medium lg:table-cell">Last pitched</th>
                  </>
                )}
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {shown.map((l) => {
                const wa = waLink(l.phone);
                return (
                  <tr key={l.key} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/40" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-2.5">
                      {l.storeId && <input type="checkbox" checked={picked.has(l.key)} onChange={() => toggle(l.key)} aria-label={`Select ${l.name}`} />}
                    </td>
                    <td className="max-w-[260px] px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold" style={{ color: "var(--text-primary)" }}>{l.name}</span>
                        {l.storeId && (
                          <Link href={`/admin/vendors/${l.storeId}`} className="shrink-0 text-zinc-400 hover:text-zinc-700" aria-label="Open vendor">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                      <p className="truncate text-[11px]" style={{ color: "var(--text-muted)" }}>{[l.category, l.email].filter(Boolean).join(" · ") || "No contact details"}</p>
                      {l.note && <p className="mt-1 line-clamp-2 text-[11px] italic" style={{ color: "var(--text-secondary)" }}>“{l.note}”</p>}
                    </td>
                    {tab === "unfinished" ? (
                      <>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {(l as UnfinishedLead).missing.map((m) => (
                              <span key={m} className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{m}</span>
                            ))}
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2.5 md:table-cell" style={{ color: "var(--text-secondary)" }}>{ago((l as UnfinishedLead).createdAt)}</td>
                        <td className="hidden whitespace-nowrap px-3 py-2.5 lg:table-cell" style={{ color: "var(--text-secondary)" }}>{ago((l as UnfinishedLead).lastReminderAt)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                              <div className={`h-full ${(l as UpgradeLead).score >= 60 ? "bg-emerald-500" : (l as UpgradeLead).score >= 35 ? "bg-amber-500" : "bg-zinc-400"}`} style={{ width: `${(l as UpgradeLead).score}%` }} />
                            </div>
                            <span className="font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{(l as UpgradeLead).score}</span>
                          </div>
                          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{(l as UpgradeLead).plan}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{naira((l as UpgradeLead).revenue30)}</span>
                          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{(l as UpgradeLead).orders30} orders</p>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2.5 md:table-cell" style={{ color: "var(--text-secondary)" }}>
                          {(l as UpgradeLead).products} / {(l as UpgradeLead).productLimit || "∞"}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2.5 lg:table-cell" style={{ color: "var(--text-secondary)" }}>{ago((l as UpgradeLead).lastPitchAt)}</td>
                      </>
                    )}
                    <td className="px-3 py-2.5"><StatusPicker value={l.status} onChange={(s) => update(l.key, { status: s })} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-0.5">
                        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="rounded p-1.5 text-[#25D366] hover:bg-zinc-100 dark:hover:bg-zinc-800"><MessageCircle className="h-4 w-4" /></a>}
                        {l.email && <a href={`mailto:${l.email}`} title="Email" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><Mail className="h-4 w-4" /></a>}
                        <button type="button" onClick={() => note(l.key, l.note)} title="Add a note" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><StickyNote className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!shown.length && (
                <tr><td colSpan={8} className="px-3 py-12 text-center" style={{ color: "var(--text-muted)" }}>No leads here{q ? ` matching "${q}"` : ""}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Sign-ups without a store can be contacted by email or WhatsApp but can&apos;t be added to a campaign (campaigns go to stores).
      </p>
    </div>
  );
}
