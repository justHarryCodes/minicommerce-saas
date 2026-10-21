"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

/** One-tap "sold out for today" — resets on its own tomorrow (Lagos time). */
export default function SoldOutTodayToggle({ productId, soldOut }: { productId: string; soldOut: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(soldOut);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !on;
    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soldOutUntil: next ? "today" : null }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return toast.error("Couldn't update");
    setOn(next);
    toast.success(next ? "Marked sold out for today" : "Available again");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={on ? "Sold out today — tap to make available" : "Mark sold out for today (resets tomorrow)"}
      className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
        on
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
          : "text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200"
      }`}
    >
      {busy && <Loader2 className="h-3 w-3 animate-spin" />}
      {on ? "Sold out today" : "Sold out today?"}
    </button>
  );
}
