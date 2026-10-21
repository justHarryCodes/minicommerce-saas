"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { BellRing, Copy, MessageCircle, ShoppingCart, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { whatsappLink } from "@/lib/phone";

export interface AbandonedCart {
  id: string;
  customerName: string | null;
  customerPhone: string;
  customerEmail: string | null;
  subtotal: number;
  items: { name: string; quantity: number; size: string | null }[];
  reminderSentAt: string | null;
  updatedAt: string;
  recoveryLink: string;
}

interface Props {
  carts: AbandonedCart[];
  storeName: string;
  autoReminders: boolean;
  stats: { recovered: number; recoveredValue: number; abandoned: number };
}

function nudgeText(cart: AbandonedCart, storeName: string): string {
  const first = (cart.customerName ?? "").trim().split(/\s+/)[0];
  const what = cart.items.length === 1 ? cart.items[0].name : `${cart.items.length} items`;
  return `Hi${first ? ` ${first}` : ""}! 👋 You left ${what} in your cart at ${storeName}. It's still available — you can complete your order here: ${cart.recoveryLink}\n\nAny questions? Just reply here.`;
}

export default function AbandonedClient({ carts, storeName, autoReminders, stats }: Props) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visible = carts.filter((c) => !hidden.has(c.id));
  const total = stats.recovered + stats.abandoned;
  const rate = total > 0 ? Math.round((stats.recovered / total) * 100) : 0;

  async function dismiss(id: string) {
    setHidden((s) => new Set(s).add(id));
    const res = await fetch(`/api/dashboard/abandoned/${id}`, { method: "PATCH" }).catch(() => null);
    if (!res?.ok) {
      toast.error("Couldn't dismiss — try again");
      setHidden((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    } else router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Recovered (30 days)", value: String(stats.recovered) },
          { label: "Recovered revenue", value: formatCurrency(stats.recoveredValue) },
          { label: "Recovery rate", value: `${rate}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
            <p className="text-xs text-surface-500 dark:text-surface-400">{s.label}</p>
            <p className="mt-1 text-lg font-bold text-surface-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${autoReminders ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-surface-50 text-surface-600 dark:bg-surface-900 dark:text-surface-300"}`}>
        <BellRing className="w-4 h-4 mt-0.5 shrink-0" />
        {autoReminders
          ? "Automatic SMS reminders are on — each shopper gets one reminder about an hour after leaving."
          : "Automatic reminders aren't active, so use the WhatsApp button to nudge shoppers yourself."}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-200 py-16 text-center dark:border-surface-700">
          <ShoppingCart className="mx-auto h-8 w-8 text-surface-300" />
          <p className="mt-3 font-semibold text-surface-900 dark:text-white">No abandoned carts right now</p>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">When a shopper leaves checkout without ordering, they&apos;ll show up here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((c) => {
            const wa = whatsappLink(c.customerPhone, nudgeText(c, storeName));
            return (
              <li key={c.id} className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-surface-900 dark:text-white">{c.customerName || "Unnamed shopper"}</p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {c.customerPhone}
                      {c.customerEmail ? ` · ${c.customerEmail}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-surface-900 dark:text-white">{formatCurrency(c.subtotal)}</p>
                    <p className="text-xs text-surface-400">{formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}</p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-surface-600 dark:text-surface-300">
                  {c.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ""} ×${i.quantity}`).join(" · ")}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Nudge on WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(c.recoveryLink).then(() => toast.success("Recovery link copied"));
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-semibold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy cart link
                  </button>
                  {c.reminderSentAt && (
                    <span className="text-xs text-surface-400">SMS reminder sent {formatDistanceToNow(new Date(c.reminderSentAt), { addSuffix: true })}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => dismiss(c.id)}
                    className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-surface-400 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" /> Dismiss
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
