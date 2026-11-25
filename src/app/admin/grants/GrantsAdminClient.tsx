"use client";

// Admin: run the Duka Vendor Grant & Support Fund. Open or close the round,
// set the amount, the product minimum and the countdown, start new rounds and
// review who applied.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, Loader2, Plus, Search, Star, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, naira, roundAcceptsApplications, type GrantRound, type GrantStatus } from "@/lib/grants-shared";
import type { ApplicationRow } from "@/lib/grants";
import GrantCountdown from "@/components/grant/GrantCountdown";

type Round = GrantRound & { applications: number };
const card = "rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";
const input = "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white";
const STATUS_TONE: Record<GrantStatus, string> = {
  unverified: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  submitted: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  shortlisted: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  selected: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};
const TABS: { id: "all" | GrantStatus; label: string }[] = [
  { id: "all", label: "All confirmed" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "selected", label: "Selected" },
  { id: "rejected", label: "Not selected" },
  { id: "unverified", label: "Unconfirmed" },
];

/** ISO -> value for <input type="datetime-local"> in the admin's own time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function endOfMonthLocal(): string {
  const d = new Date();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59);
  return toLocalInput(end.toISOString());
}
const monthTitle = () => new Date().toLocaleDateString("en-NG", { month: "long", year: "numeric" });

export default function GrantsAdminClient({ rounds, round, applications }: { rounds: Round[]; round: Round | null; applications: ApplicationRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(rounds.length === 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Vendor Grant &amp; Support Fund</h1>
          <p className="text-sm text-zinc-500">Open or close applications, set the amount and countdown, and review who applied.</p>
        </div>
        <div className="flex gap-2">
          <a href="/grant" target="_blank" rel="noopener noreferrer" className="flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
            <ExternalLink className="h-4 w-4" /> View page
          </a>
          {!creating && (
            <button type="button" onClick={() => setCreating(true)} className="flex h-9 items-center gap-1.5 rounded-xl bg-amber-400 px-3 text-sm font-bold text-black hover:bg-amber-500">
              <Plus className="h-4 w-4" /> New round
            </button>
          )}
        </div>
      </div>

      {creating && <NewRound previous={round} onDone={() => { setCreating(false); router.refresh(); }} onCancel={rounds.length ? () => setCreating(false) : undefined} />}

      {round && (
        <>
          <RoundSettings key={round.id} round={round} isLatest={round.id === rounds[0]?.id} />
          {rounds.length > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500">Round:</span>
              <select value={round.id} onChange={(e) => router.push(`/admin/grants?round=${e.target.value}`)} className={cn(input, "!w-auto")}>
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} · {r.applications} application{r.applications === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Applications round={round} applications={applications} />
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Round settings ───────────────────────── */

function RoundSettings({ round, isLatest }: { round: Round; isLatest: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(round.title);
  const [amount, setAmount] = useState(String(round.amount));
  const [minProducts, setMinProducts] = useState(String(round.min_products));
  const [closesAt, setClosesAt] = useState(toLocalInput(round.closes_at));
  const [saving, setSaving] = useState(false);
  const live = roundAcceptsApplications(round);
  const expired = round.is_open && !!round.closes_at && new Date(round.closes_at) <= new Date();
  const dirty = title !== round.title || Number(amount) !== round.amount || Number(minProducts) !== round.min_products || closesAt !== toLocalInput(round.closes_at);

  async function save(patch: Record<string, unknown>, okMsg: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/grants/rounds/${round.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Couldn't save");
      toast.success(okMsg);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={cn(card, "overflow-hidden")}>
      <div className="flex flex-col gap-4 border-b border-zinc-100 bg-gradient-to-r from-zinc-950 to-zinc-800 p-5 text-white dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">{isLatest ? "Current round (shown on the website)" : "Past round"}</p>
          <p className="mt-1 text-2xl font-black">{round.title} · {naira(round.amount)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
            <span className={cn("h-2 w-2 rounded-full", live ? "animate-pulse bg-emerald-400" : "bg-zinc-500")} />
            {live ? "Accepting applications" : expired ? "The countdown has ended: applications are closed" : "Closed"}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          {live && round.closes_at && <GrantCountdown closesAt={round.closes_at} size="sm" />}
          <button
            type="button"
            disabled={saving}
            onClick={() => void save({ isOpen: !round.is_open }, round.is_open ? "Applications closed" : "Applications are open")}
            className={cn("flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-60", round.is_open ? "bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/15" : "bg-emerald-500 text-white hover:bg-emerald-600")}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {round.is_open ? "Close applications" : "Open applications"}
          </button>
        </div>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Round name</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Grant amount (₦)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Minimum live products</span>
          <input value={minProducts} onChange={(e) => setMinProducts(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Countdown: applications close at</span>
          <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={input} />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
        <p className="text-xs text-zinc-500">No closing time = no countdown; applications stay open until you close them. Only one round can be open at a time.</p>
        <div className="flex gap-2">
          {closesAt && (
            <button type="button" onClick={() => setClosesAt("")} className="h-9 rounded-xl px-3 text-sm font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Remove countdown
            </button>
          )}
          <button
            type="button"
            disabled={!dirty || saving || !title.trim() || Number(amount) < 1000 || Number(minProducts) < 1}
            onClick={() => void save({ title: title.trim(), amount: Number(amount), minProducts: Number(minProducts), closesAt: closesAt ? new Date(closesAt).toISOString() : null }, "Round saved")}
            className="h-9 rounded-xl bg-zinc-900 px-4 text-sm font-bold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
          >
            Save changes
          </button>
        </div>
      </div>
    </section>
  );
}

function NewRound({ previous, onDone, onCancel }: { previous: Round | null; onDone: () => void; onCancel?: () => void }) {
  const [title, setTitle] = useState(monthTitle());
  const [amount, setAmount] = useState(String(previous?.amount ?? 50000));
  const [minProducts, setMinProducts] = useState(String(previous?.min_products ?? 30));
  const [closesAt, setClosesAt] = useState(endOfMonthLocal());
  const [isOpen, setIsOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), amount: Number(amount), minProducts: Number(minProducts), closesAt: closesAt ? new Date(closesAt).toISOString() : null, isOpen }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Couldn't create the round");
      toast.success(isOpen ? "New round is live on the website" : "New round created (closed)");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the round");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={cn(card, "p-5")}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">Start a new round</h2>
        {onCancel && (
          <button type="button" onClick={onCancel} aria-label="Cancel" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-0.5 text-sm text-zinc-500">The new round becomes the one shown on the website. Past rounds and their applications are kept.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Round name</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Grant amount (₦)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Minimum live products</span>
          <input value={minProducts} onChange={(e) => setMinProducts(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Applications close at</span>
          <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={input} />
        </label>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
        <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} className="h-4 w-4 rounded accent-emerald-500" /> Open applications straight away
      </label>
      <button type="button" disabled={saving || !title.trim() || Number(amount) < 1000 || Number(minProducts) < 1} onClick={() => void create()} className="mt-4 flex h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-black hover:bg-amber-500 disabled:opacity-50">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create round
      </button>
    </section>
  );
}

/* ───────────────────────── Applications ───────────────────────── */

function Applications({ round, applications }: { round: Round; applications: ApplicationRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, submitted: 0, shortlisted: 0, selected: 0, rejected: 0, unverified: 0 };
    for (const a of applications) {
      c[a.status]++;
      if (a.status !== "unverified") c.all++;
    }
    return c;
  }, [applications]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return applications.filter((a) => (tab === "all" ? a.status !== "unverified" : a.status === tab) && (!t || `${a.name} ${a.email} ${a.store_name} ${a.store_slug}`.toLowerCase().includes(t)));
  }, [applications, tab, q]);

  async function setStatus(id: string, status: GrantStatus) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/grants/applications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Couldn't update");
      toast.success(`Marked ${STATUS_LABEL[status].toLowerCase()}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update");
    } finally {
      setBusy(null);
    }
  }

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Name", "Email", "Store", "Store link", "Products at apply", "Different products now", "Still missing", "Orders", "Status", "Applied", "Confirmed", "How support would help"];
    const rows = applications.map((a) => [a.name, a.email, a.store_name, a.store_url, a.product_count, a.live_products, a.setup_missing.join("; "), a.store_orders, STATUS_LABEL[a.status], a.created_at.slice(0, 10), a.verified_at?.slice(0, 10) ?? "", a.story]);
    const blob = new Blob([[head, ...rows].map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `grant-${round.title.replace(/\s+/g, "-").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className={card}>
      <div className="grid grid-cols-2 gap-3 border-b border-zinc-100 p-5 dark:border-zinc-800 sm:grid-cols-4">
        {[
          { l: "Applications", v: counts.all, tone: "text-zinc-900 dark:text-white" },
          { l: "Shortlisted", v: counts.shortlisted, tone: "text-amber-600" },
          { l: "Selected", v: counts.selected, tone: "text-emerald-600" },
          { l: "Unconfirmed emails", v: counts.unverified, tone: "text-zinc-400" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
            <p className={cn("text-2xl font-black tabular-nums", s.tone)}>{s.v}</p>
            <p className="text-xs text-zinc-500">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={cn("flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold", tab === t.id ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}>
              {t.label} <span className="tabular-nums opacity-60">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="flex h-9 items-center gap-2 rounded-xl border border-zinc-200 px-3 dark:border-zinc-700">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or store" className="w-40 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus:ring-0 dark:text-white" />
          </label>
          {applications.length > 0 && (
            <button type="button" onClick={exportCsv} className="flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="px-5 pb-10 pt-4 text-center text-sm text-zinc-500">{applications.length ? "No applications here." : "No applications yet. Share the grant page with your vendors!"}</p>
      ) : (
        <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          {list.map((a) => {
            const short = a.setup_missing.length > 0;
            const expanded = open === a.id;
            return (
              <li key={a.id} className="px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <button type="button" onClick={() => setOpen(expanded ? null : a.id)} className="min-w-0 flex-1 text-left">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-zinc-900 dark:text-white">{a.name}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", STATUS_TONE[a.status])}>{STATUS_LABEL[a.status]}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-zinc-500">
                      {a.email} · <span className="font-medium text-zinc-700 dark:text-zinc-300">{a.store_name}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                      <span className={cn("flex items-center gap-1", short ? "font-semibold text-red-600" : "")}>
                        {short ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        {short ? `Not set up: needs ${a.setup_missing.join(", ")}` : `Store properly set up · ${a.live_products} different products`}
                      </span>
                      <span>{a.store_orders} orders</span>
                      <span>Applied {new Date(a.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <a href={a.store_url} target="_blank" rel="noopener noreferrer" className="flex h-8 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                      <ExternalLink className="h-3.5 w-3.5" /> Store
                    </a>
                    {a.status !== "unverified" && (
                      <>
                        {a.status !== "shortlisted" && a.status !== "selected" && (
                          <button type="button" disabled={busy === a.id} onClick={() => void setStatus(a.id, "shortlisted")} className="flex h-8 items-center gap-1 rounded-lg bg-amber-100 px-2.5 text-xs font-bold text-amber-800 disabled:opacity-50 dark:bg-amber-500/15 dark:text-amber-300">
                            <Star className="h-3.5 w-3.5" /> Shortlist
                          </button>
                        )}
                        {a.status !== "selected" && (
                          <button type="button" disabled={busy === a.id} onClick={() => void setStatus(a.id, "selected")} className="flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-bold text-white disabled:opacity-50">
                            <Trophy className="h-3.5 w-3.5" /> Select
                          </button>
                        )}
                        {a.status !== "rejected" && (
                          <button type="button" disabled={busy === a.id} onClick={() => void setStatus(a.id, "rejected")} className="flex h-8 items-center rounded-lg px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30">
                            Not selected
                          </button>
                        )}
                        {(a.status === "rejected" || a.status === "selected" || a.status === "shortlisted") && (
                          <button type="button" disabled={busy === a.id} onClick={() => void setStatus(a.id, "submitted")} className="flex h-8 items-center rounded-lg px-2.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800">
                            Reset
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {expanded && (
                  <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">How the support would help</p>
                    <p className="mt-1 whitespace-pre-line">{a.story || "They didn't say."}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Link they entered: {a.store_link} · Email {a.verified_at ? `confirmed ${new Date(a.verified_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}` : "not confirmed"} ·{" "}
                      <Link href={`/admin/vendors/${a.store_id}`} className="font-semibold text-amber-700 underline dark:text-amber-400">Open vendor</Link>
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
