"use client";

import { useState } from "react";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";

export default function BackInStockForm({
  storeSlug,
  productId,
  variantLabel,
  prompt,
}: {
  storeSlug: string;
  productId: string;
  /** Selected variant, or null for the whole product */
  variantLabel: string | null;
  /** Override the heading, e.g. "Your size sold out?" */
  prompt?: string;
}) {
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setState("busy");
    try {
      const res = await fetch(`/api/storefront/${storeSlug}/stock-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          phone.includes("@") ? { productId, variantLabel, email: phone.trim() } : { productId, variantLabel, phone: phone.trim() }
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> We&apos;ll let you know as soon as {variantLabel ? `${variantLabel} is` : "it's"} back.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
      <p className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white">
        <Bell className="h-4 w-4" /> {prompt ?? <>{variantLabel ? `${variantLabel} is sold out` : "Sold out"} — get notified when it&apos;s back</>}
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number or email"
          inputMode="email"
          required
          className="min-w-0 flex-1 rounded-xl border border-surface-200 bg-transparent px-3.5 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] dark:border-surface-700 dark:text-white"
        />
        <button
          type="submit"
          disabled={state === "busy" || !phone.trim()}
          className="sf-btn shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
          style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
        >
          {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Notify me"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </form>
  );
}
