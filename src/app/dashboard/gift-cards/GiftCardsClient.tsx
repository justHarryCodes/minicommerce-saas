"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Copy, Gift, History, Loader2, Plus, Repeat, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface CardView {
  id: string;
  code: string;
  kind: "gift_card" | "store_credit";
  initialAmount: number;
  balance: number;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  note: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface LedgerRow {
  id: string;
  change: string | number;
  balance_after: string | number;
  reason: "issued" | "redeemed" | "refunded" | "adjusted";
  created_at: string;
  order_number: string | null;
}

const input =
  "w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:bg-surface-900 dark:text-white";

const REASON_LABEL: Record<LedgerRow["reason"], string> = {
  issued: "Issued",
  redeemed: "Used",
  refunded: "Returned (order cancelled)",
  adjusted: "Balance edited",
};

export default function GiftCardsClient({
  cards,
  loyalty,
  rewardStats,
  canEditLoyalty,
}: {
  cards: CardView[];
  loyalty: { everyN: number | null; percent: number };
  rewardStats: { orders: number; total: number };
  canEditLoyalty: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "gift_card" | "store_credit">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const shown = useMemo(
    () =>
      cards.filter(
        (c) =>
          (filter === "all" || c.kind === filter) &&
          (!search.trim() ||
            `${c.code} ${c.recipientName ?? ""} ${c.recipientPhone ?? ""} ${c.recipientEmail ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))
      ),
    [cards, filter, search]
  );
  const outstanding = cards.filter((c) => c.isActive).reduce((s, c) => s + c.balance, 0);

  return (
    <div className="space-y-6">
      <LoyaltyCard loyalty={loyalty} stats={rewardStats} canEdit={canEditLoyalty} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cards issued" value={String(cards.length)} />
        <Stat label="Unspent balance" value={formatCurrency(outstanding)} hint="What customers can still spend" />
        <Stat label="Already spent" value={formatCurrency(cards.reduce((s, c) => s + (c.initialAmount - c.balance), 0))} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name or phone" className={`${input} max-w-xs`} />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-900 dark:text-white">
          <option value="all">All</option>
          <option value="gift_card">Gift cards</option>
          <option value="store_credit">Store credit</option>
        </select>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="ml-auto flex items-center gap-2 rounded-xl bg-accent-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-accent-500"
        >
          <Plus className="h-4 w-4" /> Issue gift card / credit
        </button>
      </div>

      {creating && <IssueForm onClose={() => setCreating(false)} onDone={() => { setCreating(false); router.refresh(); }} />}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-200 py-14 text-center dark:border-surface-700">
          <Gift className="mx-auto h-8 w-8 text-surface-300" />
          <p className="mt-3 font-semibold text-surface-900 dark:text-white">{cards.length ? "No matches" : "No gift cards yet"}</p>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Sell a gift card for cash, or refund an unhappy customer as store credit instead of cash.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-surface-100 overflow-hidden rounded-2xl border border-surface-100 bg-white dark:divide-surface-800 dark:border-surface-800 dark:bg-surface-900">
          {shown.map((c) => (
            <CardRow key={c.id} card={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} onChanged={() => router.refresh()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
      <p className="text-xs text-surface-500 dark:text-surface-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-surface-400">{hint}</p>}
    </div>
  );
}

function LoyaltyCard({ loyalty, stats, canEdit }: { loyalty: { everyN: number | null; percent: number }; stats: { orders: number; total: number }; canEdit: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(loyalty.everyN != null);
  const [everyN, setEveryN] = useState(String(loyalty.everyN ?? 5));
  const [percent, setPercent] = useState(String(loyalty.percent));
  const [saving, setSaving] = useState(false);
  const dirty = on !== (loyalty.everyN != null) || (on && (Number(everyN) !== loyalty.everyN || Number(percent) !== loyalty.percent));

  async function save() {
    setSaving(true);
    const res = await fetch("/api/dashboard/loyalty", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ everyN: on ? Number(everyN) : null, percent: Number(percent) }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok) return toast.error(data?.error ?? "Couldn't save");
    toast.success(on ? "Loyalty reward is on" : "Loyalty reward turned off");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-surface-100 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-surface-900 dark:text-white">
            <Repeat className="h-4 w-4" /> Loyalty reward
          </p>
          <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
            Applied automatically at checkout — customers are recognised by phone number. Checkout shows them how close they are.
          </p>
        </div>
        {stats.orders > 0 && (
          <p className="text-right text-xs text-surface-500 dark:text-surface-400">
            <span className="block text-lg font-bold text-surface-900 dark:text-white">{stats.orders}</span>
            rewarded orders · {formatCurrency(stats.total)} given
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-surface-700 dark:text-surface-200">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-accent-500" checked={on} disabled={!canEdit} onChange={(e) => setOn(e.target.checked)} />
          Every
        </label>
        <input type="number" min={2} max={50} value={everyN} disabled={!canEdit || !on} onChange={(e) => setEveryN(e.target.value)} className="w-16 rounded-lg border border-surface-200 bg-transparent px-2 py-1.5 text-center dark:border-surface-700" aria-label="Every how many orders" />
        <span>th order gets</span>
        <input type="number" min={1} max={90} value={percent} disabled={!canEdit || !on} onChange={(e) => setPercent(e.target.value)} className="w-16 rounded-lg border border-surface-200 bg-transparent px-2 py-1.5 text-center dark:border-surface-700" aria-label="Percent off" />
        <span>% off</span>
        {canEdit ? (
          <button type="button" onClick={save} disabled={saving || !dirty} className="ml-auto flex items-center gap-1.5 rounded-lg bg-surface-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40 dark:bg-white dark:text-black">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />} Save
          </button>
        ) : (
          <span className="ml-auto text-xs text-surface-400">Only the owner can change this</span>
        )}
      </div>
    </div>
  );
}

function IssueForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState<CardView["kind"]>("gift_card");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ code: string; amount: number; notified: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/dashboard/gift-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        amount: Math.round(Number(amount)),
        recipientName: name || null,
        recipientPhone: phone || null,
        recipientEmail: email || "",
        note: note || null,
        expiresAt: expiresAt || "",
        notify: notify && !!(phone || email),
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return toast.error(data?.error ?? "Couldn't issue");
    setIssued({ code: data.card.code, amount: Number(data.card.initial_amount), notified: data.notified });
  }

  if (issued) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{formatCurrency(issued.amount)} {kind === "store_credit" ? "store credit" : "gift card"} created</p>
        <p className="mt-3 select-all font-mono text-2xl font-bold tracking-widest text-surface-900 dark:text-white">{issued.code}</p>
        <p className="mt-2 text-xs text-emerald-800/80 dark:text-emerald-300/80">
          {issued.notified ? "We sent the code to the customer." : "Give this code to the customer — they enter it at checkout."}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={() => navigator.clipboard.writeText(issued.code).then(() => toast.success("Copied"))} className="flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:text-emerald-300">
            <Copy className="h-3.5 w-3.5" /> Copy code
          </button>
          <button type="button" onClick={onDone} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Done</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-surface-100 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
          {(["gift_card", "store_credit"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${kind === k ? "bg-white text-surface-900 shadow-sm dark:bg-surface-900 dark:text-white" : "text-surface-500"}`}>
              {k === "gift_card" ? "Gift card" : "Store credit"}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-surface-500 dark:text-surface-400">
        {kind === "gift_card" ? "Sold or given away — anyone with the code can spend it." : "For a refund or apology — tied to a customer so you know who it's for."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-surface-600 dark:text-surface-300">Amount (₦)</span>
          <input className={input} type="number" min={100} required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-surface-600 dark:text-surface-300">Expires (optional)</span>
          <input className={input} type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </label>
        <input className={input} placeholder="Customer name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        <input className={input} placeholder={kind === "store_credit" ? "Phone (or email)" : "Phone (optional)"} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
        <input className={input} type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} placeholder="Note, e.g. refund for #ORD-…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </div>
      <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-200">
        <input type="checkbox" className="h-4 w-4 accent-accent-500" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Send the code to the customer by SMS / email
      </label>
      <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-xl bg-accent-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-accent-500 disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create code
      </button>
    </form>
  );
}

function CardRow({ card: c, open, onToggle, onChanged }: { card: CardView; open: boolean; onToggle: () => void; onChanged: () => void }) {
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [newBalance, setNewBalance] = useState(String(c.balance));
  const expired = c.expiresAt != null && c.expiresAt < new Date().toISOString().slice(0, 10);

  async function toggle() {
    onToggle();
    if (!open && !ledger) {
      const res = await fetch(`/api/dashboard/gift-cards/${c.id}`).catch(() => null);
      const data = await res?.json().catch(() => ({}));
      setLedger(data?.ledger ?? []);
    }
  }

  async function patch(body: object, label: string) {
    setBusy(true);
    const res = await fetch(`/api/dashboard/gift-cards/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return toast.error("Couldn't update");
    toast.success(label);
    setLedger(null);
    onChanged();
  }

  const status = !c.isActive ? "Disabled" : expired ? "Expired" : c.balance === 0 ? "Used up" : "Active";
  const tone =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
      : "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400";

  return (
    <li>
      <button type="button" onClick={toggle} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800/40">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold text-surface-900 dark:text-white">{c.code}</p>
          <p className="truncate text-xs text-surface-500 dark:text-surface-400">
            {c.kind === "store_credit" ? "Store credit" : "Gift card"}
            {c.recipientName ? ` · ${c.recipientName}` : ""}
            {c.recipientPhone ? ` · ${c.recipientPhone}` : ""} · {format(new Date(c.createdAt), "d MMM yyyy")}
            {c.expiresAt ? ` · expires ${format(new Date(`${c.expiresAt}T12:00:00`), "d MMM yyyy")}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{status}</span>
        <span className="w-28 text-right text-sm">
          <span className="block font-bold text-surface-900 dark:text-white">{formatCurrency(c.balance)}</span>
          <span className="text-xs text-surface-400">of {formatCurrency(c.initialAmount)}</span>
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-surface-100 bg-surface-50/60 px-4 py-3 dark:border-surface-800 dark:bg-surface-950/40">
          {c.note && <p className="text-xs text-surface-600 dark:text-surface-300">Note: {c.note}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-300">
              Balance ₦
              <input type="number" min={0} value={newBalance} onChange={(e) => setNewBalance(e.target.value)} className="w-28 rounded-lg border border-surface-200 bg-white px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-900 dark:text-white" />
            </label>
            <button type="button" disabled={busy || Number(newBalance) === c.balance} onClick={() => patch({ balance: Math.round(Number(newBalance)) }, "Balance updated")} className="rounded-lg border border-surface-200 px-2.5 py-1 text-xs font-semibold text-surface-700 disabled:opacity-40 dark:border-surface-700 dark:text-surface-200">
              Set balance
            </button>
            <button type="button" disabled={busy} onClick={() => patch({ isActive: !c.isActive }, c.isActive ? "Card disabled" : "Card enabled")} className="ml-auto rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
              {c.isActive ? "Disable" : "Enable"}
            </button>
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-500"><History className="h-3.5 w-3.5" /> History</p>
            {!ledger ? (
              <Loader2 className="h-4 w-4 animate-spin text-surface-400" />
            ) : (
              <ul className="space-y-1 text-xs">
                {ledger.map((l) => (
                  <li key={l.id} className="flex justify-between gap-3 text-surface-600 dark:text-surface-300">
                    <span>
                      {format(new Date(l.created_at), "d MMM, HH:mm")} · {REASON_LABEL[l.reason]}
                      {l.order_number ? ` · ${l.order_number}` : ""}
                    </span>
                    <span className={Number(l.change) > 0 ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold"}>
                      {Number(l.change) > 0 ? "+" : "−"}
                      {formatCurrency(Math.abs(Number(l.change)))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
