"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function AcceptInviteButton({ token, storeName }: { token: string; storeName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/team/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setBusy(false);
      setError(data?.error ?? "Couldn't accept the invitation. Please try again.");
      return;
    }
    toast.success(`Welcome to ${storeName}`);
    // The role decides the landing page
    const next = await fetch("/api/auth/redirect").then((r) => r.json()).catch(() => ({ url: "/dashboard/orders" }));
    router.replace(next.url ?? "/dashboard/orders");
  }

  return (
    <div className="mt-6">
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
      <button
        type="button"
        onClick={accept}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Accept and join {storeName}
      </button>
    </div>
  );
}
