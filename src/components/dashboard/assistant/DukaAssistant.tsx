"use client";

// Duka Assistant: the support assistant in the seller dashboard (replaces the
// old live-chat widget). Answers questions, teaches, looks things up in the
// store and proposes actions the seller confirms.
//
// Open it from anywhere: window.dispatchEvent(new CustomEvent("duka-assistant:open", { detail: { prompt: "…" } }))

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowUpRight, BookOpen, Check, CheckCircle2, Circle, Lightbulb, LifeBuoy, Loader2, Maximize2,
  Minimize2, Package, PackageSearch, RotateCcw, Rocket, SendHorizontal, Sparkles, Tag, TrendingUp, Wallet, X,
} from "lucide-react";

/* ─────────────────────────── Types (mirror lib/assistant/tools) ─────────────────────────── */

type Card =
  | { kind: "orders"; title: string; orders: { number: string; customer: string; total: number; status: string; payment: string; date: string }[]; href: string }
  | { kind: "products"; title: string; products: { name: string; price: number; stock: number | null; active: boolean; image: string | null; href: string }[] }
  | { kind: "stats"; title: string; items: { label: string; value: string; note?: string }[]; href?: string }
  | { kind: "checklist"; title: string; items: { label: string; done: boolean; href: string }[] }
  | { kind: "articles"; articles: { title: string; href?: string }[] };

interface Action {
  id: string;
  title: string;
  details: [string, string][];
  warning?: string;
  confirmLabel: string;
  request: { method: "POST" | "PATCH"; url: string; body: Record<string, unknown> };
  doneText: string;
  state?: "pending" | "running" | "done" | "cancelled" | "failed";
  error?: string;
}

type Msg =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; cards?: Card[]; actions?: Action[]; followups?: string[] }
  | { id: string; role: "note"; content: string };

const STARTERS = [
  { icon: Rocket, label: "Set up my store", prompt: "What do I still need to set up in my store?" },
  { icon: Wallet, label: "How do I get paid?", prompt: "How do I get paid on Duka, and when does the money reach my bank?" },
  { icon: Package, label: "Orders to handle", prompt: "Show me orders that need my attention." },
  { icon: TrendingUp, label: "How are sales?", prompt: "How are my sales this week?" },
  { icon: PackageSearch, label: "What's running low?", prompt: "Which products are running low or sold out?" },
  { icon: Tag, label: "Make a discount code", prompt: "Help me create a discount code for my customers." },
  { icon: Lightbulb, label: "Get more sales", prompt: "Give me practical tips to get more sales this month." },
  { icon: LifeBuoy, label: "Talk to a human", prompt: "I need help from the Duka support team." },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const naira = (n: number) => `₦${Math.round(Number(n) || 0).toLocaleString("en-NG")}`;

/* ─────────────────────────── Safe markdown (no HTML injection) ─────────────────────────── */

function safeHref(href: string): { href: string; internal: boolean } | null {
  const h = href.trim();
  if (/^\/(?!\/)/.test(h)) return { href: h, internal: true };
  if (/^https:\/\/([a-z0-9-]+\.)*dukanigeria\.com(\/|$)/i.test(h)) return { href: h, internal: false };
  if (/^https?:\/\//i.test(h)) return { href: h, internal: false };
  if (/^mailto:/i.test(h)) return { href: h, internal: false };
  return null;
}

function inline(text: string, key: string, onNav: () => void): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|(?<![\w*])\*([^*\n]+)\*(?!\w)|(?<![\w_])_([^_\n]+)_(?!\w))/g;
  let last = 0, m: RegExpExecArray | null, n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${n++}`;
    if (m[2] !== undefined) {
      const link = safeHref(m[3]);
      if (!link) out.push(m[2]);
      else if (link.internal) out.push(<Link key={k} href={link.href} onClick={onNav} className="font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-amber-400">{m[2]}</Link>);
      else out.push(<a key={k} href={link.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-700 underline underline-offset-2 dark:text-amber-400">{m[2]}</a>);
    } else if (m[4] !== undefined) out.push(<strong key={k} className="font-semibold text-zinc-900 dark:text-white">{m[4]}</strong>);
    else if (m[5] !== undefined) out.push(<code key={k} className="rounded bg-zinc-100 px-1 py-0.5 text-[12px] dark:bg-zinc-800">{m[5]}</code>);
    else out.push(<em key={k}>{m[6] ?? m[7]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Markdown({ text, onNav }: { text: string; onNav: () => void }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0, b = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^#{1,4}\s+(.*)/);
    if (h) { blocks.push(<p key={b++} className="mt-1 font-bold text-zinc-900 dark:text-white">{inline(h[1], `h${b}`, onNav)}</p>); i++; continue; }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, "")); i++; }
      const L = ordered ? "ol" : "ul";
      blocks.push(<L key={b++} className={`space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-amber-500`}>{items.map((it, j) => <li key={j}>{inline(it, `l${b}-${j}`, onNav)}</li>)}</L>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^#{1,4}\s/.test(lines[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) { para.push(lines[i]); i++; }
    blocks.push(<p key={b++}>{para.map((p, j) => <Fragment key={j}>{j > 0 && <br />}{inline(p, `p${b}-${j}`, onNav)}</Fragment>)}</p>);
  }
  return <div className="space-y-2.5">{blocks}</div>;
}

/* ─────────────────────────── Cards ─────────────────────────── */

const pill: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800", confirmed: "bg-sky-100 text-sky-800", processing: "bg-violet-100 text-violet-800",
  shipped: "bg-indigo-100 text-indigo-800", delivered: "bg-emerald-100 text-emerald-800", cancelled: "bg-zinc-200 text-zinc-600",
};

function CardView({ card, onNav }: { card: Card; onNav: () => void }) {
  const box = "overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";
  if (card.kind === "articles") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {card.articles.map((a) => a.href ? (
          <Link key={a.title} href={a.href} onClick={onNav} className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:border-amber-300 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <BookOpen className="h-3 w-3" /> {a.title.replace(/^Lesson: /, "")}
          </Link>
        ) : null)}
      </div>
    );
  }
  if (card.kind === "stats") {
    return (
      <div className={box}>
        <p className="border-b border-zinc-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">{card.title}</p>
        <div className="grid grid-cols-2">
          {card.items.map((s) => (
            <div key={s.label} className="border-b border-r border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
              <p className="text-[11px] text-zinc-500">{s.label}</p>
              <p className="text-base font-bold text-zinc-900 dark:text-white">{s.value}</p>
              {s.note && <p className="text-[10px] text-zinc-400">{s.note}</p>}
            </div>
          ))}
        </div>
        {card.href && <Link href={card.href} onClick={onNav} className="flex items-center justify-center gap-1 py-2 text-xs font-semibold text-amber-700 hover:bg-zinc-50 dark:text-amber-400 dark:hover:bg-zinc-800">Open analytics <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
      </div>
    );
  }
  if (card.kind === "checklist") {
    return (
      <div className={box}>
        <p className="border-b border-zinc-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">{card.title}</p>
        {card.items.map((c) => (
          <Link key={c.label} href={c.href} onClick={onNav} className="flex items-center gap-2.5 border-b border-zinc-100 px-3 py-2 text-[13px] last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800">
            {c.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 shrink-0 text-zinc-300" />}
            <span className={c.done ? "text-zinc-400 line-through" : "font-medium text-zinc-800 dark:text-zinc-100"}>{c.label}</span>
            {!c.done && <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-zinc-400" />}
          </Link>
        ))}
      </div>
    );
  }
  if (card.kind === "orders") {
    return (
      <div className={box}>
        <p className="border-b border-zinc-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">{card.title}</p>
        {card.orders.map((o) => (
          <div key={o.number} className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 text-[12px] last:border-0 dark:border-zinc-800">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-zinc-900 dark:text-white">{o.customer}</p>
              <p className="text-zinc-400">#{o.number} · {o.date}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-zinc-900 dark:text-white">{naira(o.total)}</p>
              <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold capitalize ${pill[o.status] ?? "bg-zinc-100 text-zinc-600"}`}>{o.status}</span>
              {o.payment !== "paid" && <span className="ml-1 inline-block rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">{o.payment.replace(/_/g, " ")}</span>}
            </div>
          </div>
        ))}
        <Link href={card.href} onClick={onNav} className="flex items-center justify-center gap-1 py-2 text-xs font-semibold text-amber-700 hover:bg-zinc-50 dark:text-amber-400 dark:hover:bg-zinc-800">Open orders <ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </div>
    );
  }
  return (
    <div className={box}>
      <p className="border-b border-zinc-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">{card.title}</p>
      {card.products.map((p) => (
        <Link key={p.href + p.name} href={p.href} onClick={onNav} className="flex items-center gap-2.5 border-b border-zinc-100 px-3 py-2 text-[12px] last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800">
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">{p.image && <Image src={p.image} alt="" fill sizes="36px" className="object-cover" />}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-zinc-900 dark:text-white">{p.name}</span>
            <span className="text-zinc-400">{p.price ? naira(p.price) : ""}{!p.active && " · hidden"}</span>
          </span>
          {p.stock !== null && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.stock <= 0 ? "bg-red-100 text-red-700" : p.stock <= 5 ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}>{p.stock <= 0 ? "Sold out" : `${p.stock} left`}</span>}
        </Link>
      ))}
    </div>
  );
}

function ActionCard({ a, onConfirm, onCancel }: { a: Action; onConfirm: () => void; onCancel: () => void }) {
  const state = a.state ?? "pending";
  return (
    <div className={`overflow-hidden rounded-xl border-2 bg-white dark:bg-zinc-900 ${state === "done" ? "border-emerald-300" : state === "failed" ? "border-red-300" : "border-amber-300"}`}>
      <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
        <Sparkles className="h-4 w-4 text-amber-600" />
        <p className="text-[13px] font-bold text-zinc-900 dark:text-white">{a.title}</p>
      </div>
      <dl className="px-3 py-2 text-[12px]">
        {a.details.map(([k, v]) => (
          <div key={k} className="flex gap-3 py-0.5"><dt className="w-28 shrink-0 text-zinc-500">{k}</dt><dd className="min-w-0 break-words font-medium text-zinc-800 dark:text-zinc-100">{v}</dd></div>
        ))}
      </dl>
      {a.warning && state === "pending" && <p className="mx-3 mb-2 flex gap-1.5 rounded-lg bg-orange-50 px-2.5 py-2 text-[11px] text-orange-800 dark:bg-orange-950/30 dark:text-orange-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{a.warning}</p>}
      <div className="border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
        {state === "pending" && (
          <div className="flex gap-2">
            <button type="button" onClick={onConfirm} className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-[13px] font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">{a.confirmLabel}</button>
            <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-[13px] font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</button>
          </div>
        )}
        {state === "running" && <p className="flex items-center gap-2 text-[13px] text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Working on it…</p>}
        {state === "done" && <p className="flex items-center gap-2 text-[13px] font-semibold text-emerald-700"><Check className="h-4 w-4" /> {a.doneText}</p>}
        {state === "cancelled" && <p className="text-[13px] text-zinc-400">Cancelled. Nothing was changed.</p>}
        {state === "failed" && <p className="text-[13px] text-red-600">{a.error ?? "That didn't work."} <button type="button" onClick={onConfirm} className="font-semibold underline">Try again</button></p>}
      </div>
    </div>
  );
}

/* ─────────────────────────── The assistant ─────────────────────────── */

export default function DukaAssistant({ storeId, storeName, firstName }: { storeId: string; storeName: string; firstName?: string }) {
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const key = `duka-assistant:${storeId}`;

  // Remember the conversation on this device (per store)
  useEffect(() => {
    try { const saved = localStorage.getItem(key); if (saved) setMsgs(JSON.parse(saved)); } catch { /* private mode */ }
  }, [key]);
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(msgs.slice(-40))); } catch { /* full or blocked */ }
  }, [key, msgs]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy, open]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 80); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);
    const user: Msg = { id: uid(), role: "user", content: q.slice(0, 4000) };
    const next = [...msgs, user];
    setMsgs(next);
    setInput("");
    setBusy(true);
    // What the model sees: words only (cards were already summarised in its replies)
    const history = next
      .filter((m) => m.role !== "note" || m.content)
      .map((m) => m.role === "note" ? { role: "assistant" as const, content: `(Note: ${m.content})` } : { role: m.role, content: m.content })
      .filter((m) => m.content)
      .slice(-16);
    try {
      const res = await fetch("/api/dashboard/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history, page: pathname }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setMsgs((list) => [...list, { id: uid(), role: "assistant", content: data.reply || "", cards: data.cards ?? [], actions: (data.actions ?? []).map((a: Action) => ({ ...a, state: "pending" })), followups: data.followups ?? [] }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }, [busy, msgs, pathname]);

  // Open from anywhere in the dashboard
  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      const prompt = (e as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (prompt) setTimeout(() => send(prompt), 50);
    };
    window.addEventListener("duka-assistant:open", onOpen);
    return () => window.removeEventListener("duka-assistant:open", onOpen);
  }, [send]);

  const updateAction = (msgId: string, actionId: string, patch: Partial<Action>) =>
    setMsgs((list) => list.map((m) => m.id === msgId && m.role === "assistant" ? { ...m, actions: m.actions?.map((a) => (a.id === actionId ? { ...a, ...patch } : a)) } : m));

  async function confirm(msgId: string, a: Action) {
    updateAction(msgId, a.id, { state: "running", error: undefined });
    try {
      const body = a.request.url === "/api/dashboard/assistant/support"
        ? { ...a.request.body, transcript: msgs.filter((m) => m.role !== "note").slice(-8).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })) }
        : a.request.body;
      const res = await fetch(a.request.url, { method: a.request.method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : data.error?.formErrors?.[0] ?? "That didn't work.";
        throw new Error(msg);
      }
      updateAction(msgId, a.id, { state: "done" });
      setMsgs((list) => [...list, { id: uid(), role: "note", content: `the seller confirmed and it worked: ${a.doneText}` }]);
      router.refresh();
    } catch (e) {
      updateAction(msgId, a.id, { state: "failed", error: e instanceof Error ? e.message : "That didn't work." });
    }
  }
  function cancel(msgId: string, a: Action) {
    updateAction(msgId, a.id, { state: "cancelled" });
    setMsgs((list) => [...list, { id: uid(), role: "note", content: `the seller cancelled: ${a.title}` }]);
  }

  const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant") as Extract<Msg, { role: "assistant" }> | undefined;
  const closeOnMobileNav = () => { if (window.innerWidth < 640) setOpen(false); };

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Duka Assistant"
          className="group fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-3 z-40 flex items-center gap-2 rounded-full bg-zinc-900 p-1.5 text-white lg:py-2 lg:pl-2 lg:pr-4 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 lg:bottom-6 lg:right-6 dark:bg-white dark:text-zinc-900"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-400">
            <Image src="/logo-mark.png" alt="" width={14} height={22} className="h-[22px] w-auto brightness-0" />
          </span>
          <span className="hidden text-sm font-bold lg:inline">Ask Duka</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Duka Assistant"
          className={`fixed inset-0 z-[70] flex flex-col bg-zinc-50 dark:bg-zinc-950 sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(720px,calc(100vh-48px))] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-zinc-200 sm:shadow-2xl sm:dark:border-zinc-800 ${wide ? "sm:w-[min(760px,calc(100vw-48px))]" : "sm:w-[420px]"}`}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-900 dark:bg-zinc-800">
              <Image src="/logo-mark.png" alt="Duka" width={14} height={22} className="h-[22px] w-auto" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold leading-tight text-zinc-900 dark:text-white">Duka Assistant</p>
              <p className="flex items-center gap-1 truncate text-[11px] text-zinc-500"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" /> <span className="truncate">Answers and actions for {storeName}</span></p>
            </div>
            {msgs.length > 0 && (
              <button type="button" onClick={() => { setMsgs([]); setError(null); }} title="New conversation" aria-label="New conversation" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><RotateCcw className="h-4 w-4" /></button>
            )}
            <button type="button" onClick={() => setWide((w) => !w)} title={wide ? "Smaller" : "Bigger"} aria-label={wide ? "Smaller window" : "Bigger window"} className="hidden h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:grid">{wide ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
          </div>

          {/* Conversation */}
          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4">
            {msgs.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 p-4 text-white">
                  <p className="text-lg font-bold">Hi{firstName ? ` ${firstName}` : ""} 👋</p>
                  <p className="mt-1 text-sm text-zinc-300">I&apos;m your Duka Assistant. Ask me how anything works, check on your orders and sales, or let me make changes for you (you always confirm first).</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {STARTERS.map((s) => (
                    <button key={s.label} type="button" onClick={() => send(s.prompt)} className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-[13px] font-semibold text-zinc-800 transition-colors hover:border-amber-300 hover:bg-amber-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                      <s.icon className="h-4 w-4 shrink-0 text-amber-600" /> {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-zinc-900 px-3.5 py-2.5 text-[14px] text-white dark:bg-amber-400 dark:text-zinc-900">{m.content}</div>
              ) : m.role === "note" ? (
                <p key={m.id} className="text-center text-[11px] text-zinc-400">{m.content.replace(/^the seller /, "You ")}</p>
              ) : (
                <div key={m.id} className="flex gap-2">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-400"><Image src="/logo-mark.png" alt="" width={9} height={14} className="h-3.5 w-auto brightness-0" /></span>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    {m.content && <div className="rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-zinc-700 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800"><Markdown text={m.content} onNav={closeOnMobileNav} /></div>}
                    {m.cards?.map((c, i) => <CardView key={i} card={c} onNav={closeOnMobileNav} />)}
                    {m.actions?.map((a) => <ActionCard key={a.id} a={a} onConfirm={() => confirm(m.id, a)} onCancel={() => cancel(m.id, a)} />)}
                    {m === lastAssistant && !busy && m.followups && m.followups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {m.followups.map((f) => <button key={f} type="button" onClick={() => send(f)} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">{f}</button>)}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}

            {busy && (
              <div className="flex gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-400"><Image src="/logo-mark.png" alt="" width={9} height={14} className="h-3.5 w-auto brightness-0" /></span>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800" aria-label="Thinking">
                  {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            )}
            {error && <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:bg-red-950/40 dark:text-red-300"><AlertTriangle className="h-4 w-4 shrink-0" /> {error}</p>}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
            className="border-t border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900"
            style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 focus-within:border-amber-400 dark:border-zinc-700 dark:bg-zinc-800">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
                rows={1}
                maxLength={2000}
                placeholder="Ask anything about your store…"
                className="max-h-32 min-h-[24px] flex-1 resize-none border-0 bg-transparent p-0 text-[14px] text-zinc-900 shadow-none outline-none placeholder:text-zinc-400 focus:ring-0 dark:text-white"
                style={{ height: Math.min(128, 24 + (input.match(/\n/g)?.length ?? 0) * 20) }}
              />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-400 text-zinc-900 disabled:opacity-40">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-zinc-400">The assistant can make mistakes. Changes only happen when you tap Confirm.</p>
          </form>
        </div>
      )}
    </>
  );
}
