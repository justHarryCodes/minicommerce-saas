"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

const input =
  "w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400";
const label = "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5";

export default function DeletionForm() {
  const [role, setRole] = useState<"vendor" | "customer" | "other">("vendor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState<string | null | undefined>(undefined);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/data-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(f), role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setCode(data.code ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (code !== undefined) {
    return (
      <div className="rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-5">
        <p className="flex items-center gap-2 font-bold text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" /> Request received
        </p>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2">
          We&apos;ve emailed you a copy.
          {code && (
            <>
              {" "}Your code is <strong className="font-mono">{code}</strong>.{" "}
              <Link href={`/data-deletion?code=${code}`} className="font-semibold underline">Check its status</Link>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
      <fieldset>
        <legend className={label}>I am</legend>
        <div className="flex flex-wrap gap-2">
          {([
            ["vendor", "A vendor with a store"],
            ["customer", "A shopper"],
            ["other", "Someone else"],
          ] as const).map(([v, l]) => (
            <button
              type="button"
              key={v}
              onClick={() => setRole(v)}
              aria-pressed={role === v}
              className={`px-3.5 py-2 rounded-full border text-sm font-medium transition-colors ${
                role === v
                  ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dd-email" className={label}>Email</label>
          <input id="dd-email" name="email" type="email" required autoComplete="email" className={input} />
          <p className="text-xs text-zinc-400 mt-1">{role === "vendor" ? "The email you sign in to Duka with." : "We'll send updates here."}</p>
        </div>
        <div>
          <label htmlFor="dd-phone" className={label}>Phone or WhatsApp number <span className="text-zinc-400 font-normal">(optional)</span></label>
          <input id="dd-phone" name="phone" type="tel" autoComplete="tel" className={input} />
        </div>
      </div>

      <div>
        <label htmlFor="dd-store" className={label}>
          {role === "vendor" ? "Your store name or link" : "Which store? (name or link)"} <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <input id="dd-store" name="storeName" className={input} placeholder="e.g. amaka.dukanigeria.com" />
      </div>

      <div>
        <label htmlFor="dd-details" className={label}>Anything else? <span className="text-zinc-400 font-normal">(optional)</span></label>
        <textarea id="dd-details" name="details" rows={3} maxLength={2000} className={input} />
      </div>

      {/* Honeypot: hidden from people, bots fill it */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Request deletion
      </button>
    </form>
  );
}
