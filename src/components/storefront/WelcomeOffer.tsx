"use client";

// Growth engine on the storefront: a first-order offer that turns an
// anonymous visitor into a contact. Shown once, politely: after a while on
// the page, half-way down it, or when a desktop visitor heads for the close
// button. Never on checkout, receipts or order tracking. Uses the store's own
// colours (vendor stores never take Duka's theme).
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Copy, Gift, Loader2, X } from "lucide-react";

const SNOOZE_DAYS = 14;

export default function WelcomeOffer({ storeSlug, storeName, percent, headline }: { storeSlug: string; storeName: string; percent: number; headline: string }) {
  const pathname = usePathname() ?? "";
  const key = `sf_welcome:${storeSlug}`;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; code?: string; percent?: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const shown = useRef(false);
  const blocked = /\/(checkout|receipt|track)(\/|$)/.test(pathname);

  const show = useCallback(() => {
    if (shown.current) return;
    shown.current = true;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (blocked) return;
    try {
      const v = localStorage.getItem(key);
      if (v === "claimed") return;
      if (v && Date.now() - Number(v) < SNOOZE_DAYS * 86_400_000) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(show, 15_000);
    const onScroll = () => {
      const h = document.documentElement;
      if (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) > 0.5) show();
    };
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [blocked, key, show]);

  const close = () => {
    setOpen(false);
    try {
      if (!result) localStorage.setItem(key, String(Date.now()));
    } catch {}
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      let visitorId: string | null = null;
      try {
        visitorId = localStorage.getItem("sf_vid");
      } catch {}
      const res = await fetch(`/api/storefront/${storeSlug}/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(f.get("name") ?? "").trim() || null,
          phone: String(f.get("phone") ?? ""),
          email: String(f.get("email") ?? "").trim() || null,
          consent: f.get("consent") === "on",
          website: String(f.get("website") ?? ""),
          visitorId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult(data);
      try {
        localStorage.setItem(key, "claimed");
        if (data.code) localStorage.setItem(`sf_welcome_code:${storeSlug}`, data.code);
      } catch {}
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const accentBtn = { backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" } as const;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={headline}>
      <button type="button" aria-label="Close" onClick={close} className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-t-[28px] bg-white shadow-2xl animate-slide-up dark:bg-surface-900 sm:rounded-[28px] sm:animate-scale-in"
        style={{ fontFamily: "var(--sf-font)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-current backdrop-blur hover:bg-black/20">
          <X className="h-4 w-4" />
        </button>

        {/* Offer band in the store's colour */}
        <div className="relative px-6 pb-6 pt-8 text-center" style={accentBtn}>
          <div className="absolute -left-8 -top-10 h-32 w-32 rounded-full bg-white/15" aria-hidden />
          <div className="absolute -bottom-12 -right-6 h-36 w-36 rounded-full bg-white/10" aria-hidden />
          <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Gift className="h-6 w-6" />
          </span>
          <p className="relative mt-3 text-[13px] font-semibold uppercase tracking-[0.18em] opacity-80">{storeName}</p>
          <p className="relative mt-1 text-[44px] font-black leading-none tracking-tight">{result?.percent ?? percent}% OFF</p>
          <p className="relative mt-2 text-[15px] font-semibold">{headline}</p>
        </div>

        <div className="px-6 pb-6 pt-5">
          {!result ? (
            <form onSubmit={submit} className="space-y-3">
              <p className="text-center text-sm text-surface-600 dark:text-surface-300">Enter your number and get your own code to use at checkout.</p>
              <input name="name" autoComplete="given-name" placeholder="Your first name (optional)" maxLength={80} className="w-full rounded-xl border border-surface-200 bg-transparent px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] dark:border-surface-700 dark:text-white" />
              <input name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="WhatsApp number, e.g. 0803 123 4567" maxLength={30} className="w-full rounded-xl border border-surface-200 bg-transparent px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] dark:border-surface-700 dark:text-white" />
              <input name="email" type="email" inputMode="email" autoComplete="email" placeholder="Email (optional): we'll send your code there too" maxLength={160} className="w-full rounded-xl border border-surface-200 bg-transparent px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] dark:border-surface-700 dark:text-white" />
              {/* Honeypot for bots */}
              <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-surface-600 dark:text-surface-300">
                <input name="consent" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 rounded border-surface-300" style={{ accentColor: "var(--sf-accent)" }} />
                <span>Yes, {storeName} can send me offers and new arrivals on WhatsApp or email. I can stop anytime.</span>
              </label>
              {error && <p className="text-sm font-medium text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold transition-opacity hover:opacity-90 disabled:opacity-60" style={accentBtn}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Get my {percent}% code
              </button>
              <button type="button" onClick={close} className="w-full py-1 text-sm text-surface-500 hover:text-surface-800 dark:hover:text-surface-200">
                No thanks
              </button>
            </form>
          ) : result.status === "code" && result.code ? (
            <div className="text-center">
              <p className="text-sm text-surface-600 dark:text-surface-300">Here&apos;s your code. We&apos;ve saved it, and it&apos;ll be ready at checkout.</p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(result.code!).then(() => setCopied(true)).catch(() => {});
                }}
                className="mx-auto mt-3 flex items-center gap-3 rounded-2xl border-2 border-dashed px-5 py-3 font-mono text-xl font-black tracking-wider text-surface-900 dark:text-white"
                style={{ borderColor: "var(--sf-accent)" }}
              >
                {result.code}
                {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-surface-400" />}
              </button>
              <p className="mt-2 text-xs text-surface-500">One use, on your first order. Valid for 30 days.</p>
              <button type="button" onClick={close} className="mt-4 flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-bold" style={accentBtn}>
                Start shopping
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[15px] font-semibold text-surface-900 dark:text-white">{result.status === "customer" ? "Welcome back! 💛" : "You're on the list 💛"}</p>
              <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">
                {result.status === "customer"
                  ? "This offer is for first orders, but you'll be first to hear about our next deals."
                  : "You've already used your welcome code. You'll be first to hear about our next deals."}
              </p>
              <button type="button" onClick={close} className="mt-4 flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-bold" style={accentBtn}>
                Keep shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
