"use client";

// Broadcasts: tell your whole list about new arrivals, a sale or news.
// By email (sent for you, in your store's name) or on WhatsApp (one tap per
// person from your own phone: free, and it feels personal).
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, Loader2, Lock, Mail, Megaphone, MessageCircle, Send, Sparkles } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { clThumb } from "@/lib/cloudinary";
import { whatsappLink } from "@/lib/phone";
import type { ContactRow } from "@/lib/growth-shared";
import type { Audience, BroadcastRow } from "@/lib/growth-broadcasts";
import SocialIcon from "@/components/SocialIcon";
import { ELEMENT_SNIPPETS, plainText } from "@/lib/email-elements";
import { themeById, withAccent } from "@/lib/email-themes";
import { MessagePreview } from "@/components/marketing/MessageElements";

export interface BroadcastProps {
  allowed: boolean;
  audience: Record<Audience, number>;
  history: BroadcastRow[];
  products: { id: string; name: string; price: number; image: string | null }[];
  coupons: { id: string; code: string; label: string }[];
}

const card = "rounded-2xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900";
const input = "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white";

// Starting points. Each has a look (emoji badge + label) and uses the email
// elements: "• ✨" icon rows, "> 💡" tip boxes, "[[🚚 Title | line]]" tiles.
const TEMPLATES = [
  { label: "New arrivals", theme: "new", subject: "New arrivals are in 🎉", body: "Fresh stock just landed and we picked a few favourites for you ✨\n\n• 🆕 **Brand-new styles**, in limited numbers\n• 📸 Real photos, real prices\n• 🚚 Quick delivery to your door\n\n> 💡 They go fast, so have a look before your size is gone!" },
  { label: "Sale", theme: "sale", subject: "Our sale starts now 🔥", body: "For a few days only, we're taking money off some of our best sellers.\n\n[[🔥 Big savings | On best sellers]]\n[[⏳ Few days only | Ends soon]]\n[[🚚 Fast delivery | To your door]]\n\n> 🏷️ Use the code below at checkout." },
  { label: "Back in stock", theme: "restock", subject: "It's back in stock! 📦", body: "The ones everyone kept asking about are back 🙌\n\n• ✅ **Restocked** in all the popular sizes\n• ⚡ Last time they sold out in days\n\n> 💡 Grab yours while they last." },
  { label: "Thank you", theme: "thanks", subject: "Thank you for shopping with us 💛", body: "We just wanted to say thank you. Every order helps our small business grow 🙏\n\n• 💬 Tell a friend about us\n• ⭐ Leave a review on your order\n• 🛍️ Come back for new styles every week\n\n> 💛 Here's a little something for your next order." },
  { label: "Festive", theme: "festive", subject: "Our festive picks are here 🎄", body: "The season is here and we're ready for it 🎉\n\n1. **Pick your gifts** early\n2. **Order before** the holiday rush\n3. **Relax**, we deliver to your door\n\n> 🎁 Gifting? Tell us at checkout and we'll wrap it nicely." },
];
const LOOKS = ["new", "sale", "restock", "thanks", "festive", "plain"] as const;
const SNIPPETS = ELEMENT_SNIPPETS.filter((e) => e.id !== "image");
const AUDIENCES: { id: Audience; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "buyers", label: "Past buyers" },
  { id: "not_bought", label: "Haven't bought yet" },
];

export default function BroadcastCard({ store, data, contacts }: { store: { name: string; url: string; accent?: string }; data: BroadcastProps; contacts: ContactRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"email" | "whatsapp">("email");
  const [audience, setAudience] = useState<Audience>("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [theme, setTheme] = useState<string>("plain");
  const [showPreview, setShowPreview] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [couponId, setCouponId] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());

  const count = data.audience[audience];
  const waPeople = useMemo(() => contacts.filter((c) => !c.unsubscribed_at && (audience === "all" || (audience === "buyers" ? c.orders > 0 : c.orders === 0))), [contacts, audience]);
  const coupon = data.coupons.find((c) => c.id === couponId);
  const waText = (name: string | null) => {
    const hi = name ? `Hi ${name.split(" ")[0]}! ` : "Hi! ";
    const msg = plainText(body).trim() || subject.trim() || `We've got something new at ${store.name}`;
    return `${hi}${msg}${coupon ? `\n\nUse code ${coupon.code} for ${coupon.label}.` : ""}\n\n${store.url}${store.url.includes("?") ? "&" : "?"}utm_source=whatsapp`;
  };

  async function send() {
    setSending(true);
    try {
      const res = await fetch("/api/dashboard/growth/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, productIds: picked, couponId: couponId || null, audience, theme }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Couldn't send");
      toast.success(d.recipients > d.sentNow ? `Sending to ${d.recipients} people. The rest go out within the hour.` : `Sent to ${d.sentNow} people`);
      setOpen(false);
      setConfirming(false);
      setSubject("");
      setBody("");
      setTheme("plain");
      setPicked([]);
      setCouponId("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={cn(card, "p-4 sm:p-5")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">Bring back</p>
          <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-white">
            <Megaphone className="h-4 w-4 text-pink-500" /> Broadcasts {!data.allowed && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Pro</span>}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">Tell your list about new arrivals, a sale or news, by email or from your own WhatsApp.</p>
        </div>
        {data.allowed && !open && (
          <button type="button" onClick={() => setOpen(true)} className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-bold text-white dark:bg-white dark:text-zinc-900">
            <Send className="h-4 w-4" /> New broadcast
          </button>
        )}
      </div>

      {!data.allowed && (
        <Link href="/dashboard/billing" className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-200">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="flex-1">Go Pro to email your whole list in one go, with your products and a discount code.</span>
          <span className="shrink-0 font-bold underline underline-offset-2">Upgrade</span>
        </Link>
      )}

      {data.allowed && open && (
        <div className="mt-4 space-y-4 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/40">
          {/* Mode */}
          <div className="flex w-fit rounded-xl bg-white p-1 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700">
            {([["email", "Email"], ["whatsapp", "WhatsApp"]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id} className={cn("flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold", mode === id ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500")}>
                {id === "whatsapp" ? <SocialIcon name="whatsapp" size={16} label="" className="rounded-[4px]" /> : <Mail className="h-4 w-4" />} {label}
              </button>
            ))}
          </div>

          {/* Who */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Who gets it</p>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map((a) => (
                <button key={a.id} type="button" onClick={() => setAudience(a.id)} aria-pressed={audience === a.id} className={cn("h-8 rounded-full px-3.5 text-sm font-semibold", audience === a.id ? "bg-pink-100 text-pink-900 dark:bg-pink-500/20 dark:text-pink-200" : "bg-white text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700")}>
                  {a.label} <span className="opacity-60">{mode === "email" ? data.audience[a.id] : contacts.filter((c) => !c.unsubscribed_at && (a.id === "all" || (a.id === "buyers" ? c.orders > 0 : c.orders === 0))).length}</span>
                </button>
              ))}
            </div>
            {mode === "email" && <p className="mt-1 text-[11px] text-zinc-400">Counts people on your list who gave an email.</p>}
          </div>

          {/* What */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Start from</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.label} type="button" onClick={() => { setSubject(t.subject); setBody(t.body); setTheme(t.theme); }} className="flex h-8 items-center gap-1.5 rounded-full bg-white pl-1 pr-3 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 hover:ring-amber-400 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-[13px]" style={{ background: themeById(t.theme).tint }}>{themeById(t.theme).emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {mode === "email" && <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="Subject, e.g. New arrivals are in 🎉" className={input} />}
          {mode === "email" && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Look</p>
              <div className="flex flex-wrap gap-1.5">
                {LOOKS.map((id) => {
                  const t = themeById(id);
                  const on = theme === id;
                  return (
                    <button key={id} type="button" onClick={() => setTheme(id)} aria-pressed={on} className={cn("flex h-8 items-center gap-1.5 rounded-full pl-1 pr-3 text-[13px] font-semibold ring-1", on ? "bg-zinc-900 text-white ring-zinc-900 dark:bg-white dark:text-zinc-900 dark:ring-white" : "bg-white text-zinc-600 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700")}>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-[13px]" style={{ background: t.tint }}>{t.emoji}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Add</span>
              {SNIPPETS.map((e) => (
                <button key={e.id} type="button" onClick={() => setBody((b) => `${b.trim()}${b.trim() ? "\n\n" : ""}${e.text}`)} className="flex h-7 items-center gap-1 rounded-lg bg-white px-2 text-[12px] font-semibold text-zinc-600 ring-1 ring-zinc-200 hover:ring-amber-400 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700">
                  <span>{e.emoji}</span> {e.label}
                </button>
              ))}
            </div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={mode === "email" ? 4000 : 700} rows={7} placeholder={"Your message. Keep it short and friendly.\n\n• ✨ A line starting with • and an emoji becomes an icon row\n> 💡 A line starting with > becomes a tip box"} className={cn(input, "resize-y")} />
          </div>
          {mode === "email" && body.trim().length > 0 && (
            <div>
              <button type="button" onClick={() => setShowPreview((v) => !v)} className="mb-2 text-xs font-semibold text-zinc-500 underline underline-offset-2">
                {showPreview ? "Hide preview" : "Show preview"}
              </button>
              {showPreview && (
                <div className="mx-auto max-w-md">
                  <MessagePreview
                    theme={withAccent(theme === "plain" ? { ...themeById("plain"), emoji: "", kicker: "" } : themeById(theme), store.accent ?? "#f59e0b")}
                    headline={subject}
                    body={`Hi Ada,\n\n${body}`}
                    cta="Shop now"
                    header={<p className="text-center text-[15px] font-bold text-zinc-900">{store.name}</p>}
                    footer={coupon ? <p className="rounded-xl border-2 border-dashed px-3 py-2 text-center font-mono text-lg font-bold tracking-widest text-zinc-900" style={{ borderColor: store.accent ?? "#f59e0b" }}>{coupon.code}</p> : null}
                  />
                </div>
              )}
            </div>
          )}

          {data.coupons.length > 0 && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Add a discount code (optional)</span>
              <select value={couponId} onChange={(e) => setCouponId(e.target.value)} className={input}>
                <option value="">No code</option>
                {data.coupons.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} · {c.label}</option>
                ))}
              </select>
            </label>
          )}

          {mode === "email" ? (
            <>
              {data.products.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Show up to 3 products <span className="font-normal text-zinc-400">({picked.length}/3)</span></p>
                  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                    {data.products.map((p) => {
                      const on = picked.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPicked((x) => (on ? x.filter((i) => i !== p.id) : x.length < 3 ? [...x, p.id] : x))}
                          aria-pressed={on}
                          className={cn("relative w-24 shrink-0 overflow-hidden rounded-xl bg-white text-left ring-2 dark:bg-zinc-900", on ? "ring-pink-500" : "ring-transparent")}
                        >
                          {p.image ? <Image src={clThumb(p.image)} alt="" width={96} height={96} className="h-24 w-24 object-cover" /> : <span className="block h-24 w-24 bg-zinc-100 dark:bg-zinc-800" />}
                          {on && <Check className="absolute right-1.5 top-1.5 h-5 w-5 rounded-full bg-pink-500 p-0.5 text-white" />}
                          <span className="block truncate px-1.5 pt-1 text-[11px] text-zinc-700 dark:text-zinc-300">{p.name}</span>
                          <span className="block px-1.5 pb-1.5 text-[11px] font-bold text-zinc-900 dark:text-white">{formatCurrency(p.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {!confirming ? (
                <button type="button" disabled={!subject.trim() || body.trim().length < 10 || count === 0} onClick={() => setConfirming(true)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-pink-600 text-sm font-bold text-white disabled:opacity-40">
                  <Send className="h-4 w-4" /> Send to {count} {count === 1 ? "person" : "people"}
                </button>
              ) : (
                <div className="rounded-xl bg-white p-3 ring-1 ring-pink-200 dark:bg-zinc-900 dark:ring-pink-900">
                  <p className="text-sm text-zinc-700 dark:text-zinc-200">
                    Send <strong>&ldquo;{subject}&rdquo;</strong> to <strong>{count}</strong> {count === 1 ? "person" : "people"}? You can send one broadcast a day.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => setConfirming(false)} className="h-10 flex-1 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">Back</button>
                    <button type="button" onClick={() => void send()} disabled={sending} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-pink-600 text-sm font-bold text-white disabled:opacity-60">
                      {sending && <Loader2 className="h-4 w-4 animate-spin" />} Yes, send it
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="mb-2 text-xs text-zinc-500">Tap each person: WhatsApp opens with your message ready, then tap send. {done.size} of {waPeople.length} done.</p>
              <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-xl bg-white ring-1 ring-zinc-200 dark:divide-zinc-800 dark:bg-zinc-900 dark:ring-zinc-700">
                {waPeople.length === 0 && <li className="px-3 py-6 text-center text-sm text-zinc-500">No one in this group yet.</li>}
                {waPeople.map((c) => {
                  const href = whatsappLink(c.phone, waText(c.name));
                  const sent = done.has(c.id);
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-zinc-800 dark:text-zinc-100">{c.name || c.phone}</span>
                      {href && (
                        <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => setDone((s) => new Set(s).add(c.id))} className={cn("flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold", sent ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800" : "bg-[#25D366] text-white")}>
                          {sent ? <Check className="h-3.5 w-3.5" /> : <SocialIcon name="whatsapp" size={14} label="" className="rounded-[3px] ring-1 ring-white/50" />} {sent ? "Opened" : "Send"}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <button type="button" onClick={() => { setOpen(false); setConfirming(false); }} className="w-full text-center text-sm font-medium text-zinc-500">Close</button>
        </div>
      )}

      {data.history.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Recent broadcasts</p>
          <ul className="divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-200/80 dark:divide-zinc-800 dark:ring-zinc-800">
            {data.history.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-zinc-900 dark:text-white">{b.subject}</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(b.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })} · {b.status === "sending" ? `Sending… ${b.sent}/${b.recipients}` : `${b.sent} sent`}
                    {b.coupon_code ? ` · code ${b.coupon_code}` : ""}
                  </span>
                </span>
                <span className="text-xs text-zinc-500">
                  <strong className="text-zinc-900 dark:text-white">{b.orders}</strong> order{b.orders === 1 ? "" : "s"} · <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(b.revenue)}</strong> in 7 days
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.allowed && !open && data.history.length === 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
          <Lock className="h-3 w-3" /> Only people who agreed to hear from you get broadcasts, and every email has a one-click stop link.
        </p>
      )}
    </section>
  );
}
