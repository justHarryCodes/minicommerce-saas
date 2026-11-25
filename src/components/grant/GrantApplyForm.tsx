"use client";

// The application form. No login: the applicant confirms the store owner's
// email from their inbox, which proves the store is theirs.
import { useState } from "react";
import { CheckCircle2, Loader2, MailCheck, Send } from "lucide-react";

const input =
  "w-full rounded-xl border bg-transparent px-4 py-3 text-[15px] outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25";

export default function GrantApplyForm({ minProducts }: { minProducts: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ maskedEmail: string; resent: boolean } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/grant/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          storeLink: f.get("storeLink"),
          story: String(f.get("story") ?? "").trim() || null,
          agree: f.get("agree") === "on",
          website: String(f.get("website") ?? ""),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Something went wrong. Please try again.");
      setSent({ maskedEmail: d.maskedEmail, resent: d.resent });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="py-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <MailCheck className="h-7 w-7" />
        </span>
        <h3 className="mt-4 text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Check your inbox
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          We {sent.resent ? "sent a new" : "sent a"} confirmation link to <strong>{sent.maskedEmail}</strong>. Click it to submit your application. It only counts once you confirm.
        </p>
        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          Can&apos;t find it? Check your spam folder. The link works for 48 hours.
        </p>
      </div>
    );
  }

  const border = { borderColor: "var(--border)", color: "var(--text-primary)" };
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Full name</span>
        <input name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Adaeze Okafor" className={input} style={border} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Email address</span>
        <input name="email" type="email" required maxLength={160} autoComplete="email" placeholder="The email you log in to Duka with" className={input} style={border} />
        <span className="mt-1 block text-xs" style={{ color: "var(--text-muted)" }}>Must be your Duka login email (or your store&apos;s contact email). We&apos;ll send a link there to confirm the store is yours.</span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Your store link</span>
        <input name="storeLink" required maxLength={300} inputMode="url" autoComplete="url" placeholder="yourstore.dukanigeria.com" className={input} style={border} />
        <span className="mt-1 block text-xs" style={{ color: "var(--text-muted)" }}>We check it has {minProducts} different products, a logo, a description, a contact number and payment details.</span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          How would this support help your business? <span className="font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span>
        </span>
        <textarea name="story" rows={4} maxLength={600} placeholder="E.g. I'd restock my best sellers and improve my packaging…" className={`${input} resize-y`} style={border} />
      </label>
      {/* Honeypot for bots */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug" style={{ color: "var(--text-secondary)" }}>
        <input name="agree" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 rounded accent-amber-500" />
        <span>
          I own this store and agree to the{" "}
          <a href="#terms" className="font-semibold underline decoration-amber-400 decoration-2 underline-offset-2" style={{ color: "var(--text-primary)" }}>
            terms and conditions
          </a>
          .
        </span>
      </label>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-[15px] font-bold text-black transition hover:bg-amber-500 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit application
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No login needed. We check your store and confirm it&apos;s yours by email.
      </p>
    </form>
  );
}
