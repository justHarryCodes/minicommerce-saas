// Building blocks for the phone layout of the vendor dashboard. The shapes are
// borrowed from apps vendors already use every day (WhatsApp chat rows,
// Instagram story circles and profile grids, TikTok's create button) so the
// dashboard feels familiar. Nothing social: no likes, follows or comments.
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const AVATAR_TONES = [
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300",
];

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "")).toUpperCase();
}

/** The same person always gets the same colour. */
export function toneFor(name: string | null | undefined): string {
  let h = 0;
  for (const ch of name ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

/** A round avatar with initials (customers) or a picture (the store logo). */
export function Avatar({ name, src, size = 48, className }: { name: string | null | undefined; src?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (src) {
    return (
      <span className={cn("relative block shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-black/5 dark:ring-white/10", className)} style={style}>
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-contain" />
      </span>
    );
  }
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full font-bold", toneFor(name), className)} style={{ ...style, fontSize: Math.round(size * 0.36) }}>
      {initials(name)}
    </span>
  );
}

/** Order status in everyday words (the chat-row subtitle). */
export const ORDER_WORDS: Record<string, string> = {
  pending: "New order",
  confirmed: "Confirmed",
  processing: "Packing",
  shipped: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Payment status in everyday words. */
export const PAYMENT_WORDS: Record<string, { text: string; tone: string }> = {
  paid: { text: "Paid", tone: "text-emerald-600 dark:text-emerald-400" },
  deposit_paid: { text: "Deposit paid", tone: "text-emerald-600 dark:text-emerald-400" },
  pending: { text: "Not paid yet", tone: "text-zinc-500" },
  pending_confirmation: { text: "Check your bank", tone: "text-orange-600 dark:text-orange-400" },
  failed: { text: "Payment failed", tone: "text-red-600" },
  rejected: { text: "Money not received", tone: "text-red-600" },
};

/** Does this order need the seller to do something? (the "unread" dot) */
export function needsAction(o: { order_status?: string | null; payment_status?: string | null }): boolean {
  return o.order_status === "pending" || o.payment_status === "pending_confirmation";
}

/** One circle in a stories-style row: icon or picture, a ring, a label, an optional count. */
export function StoryBubble({
  href,
  label,
  icon: Icon,
  src,
  ring = "muted",
  count,
  tone = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  external,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  src?: string | null;
  /** "hot" = gradient ring (something waiting), "todo" = dashed (setup step), "muted" = thin grey */
  ring?: "hot" | "todo" | "muted";
  count?: number;
  tone?: string;
  external?: boolean;
}) {
  const ringCls =
    ring === "hot"
      ? "bg-[conic-gradient(from_200deg,#f59e0b,#f97316,#ef4444,#f59e0b)] p-[2.5px]"
      : ring === "todo"
        ? "border-2 border-dashed border-amber-400 p-[2px]"
        : "border border-zinc-200 p-[2px] dark:border-zinc-700";
  const inner = (
    <>
      <span className={cn("relative block rounded-full", ringCls)}>
        <span className="block rounded-full bg-white p-[2px] dark:bg-zinc-950">
          {src ? (
            <span className="relative block h-[60px] w-[60px] overflow-hidden rounded-full bg-white">
              <Image src={src} alt="" fill sizes="60px" className="object-contain" />
            </span>
          ) : (
            <span className={cn("flex h-[60px] w-[60px] items-center justify-center rounded-full", tone)}>{Icon && <Icon className="h-6 w-6" strokeWidth={2} />}</span>
          )}
        </span>
        {!!count && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[22px] rounded-full border-2 border-white bg-red-500 px-1 text-center text-[11px] font-bold leading-[18px] text-white dark:border-zinc-950">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <span className="mt-1.5 block w-[72px] truncate text-center text-[11.5px] font-medium leading-tight text-zinc-700 dark:text-zinc-300">{label}</span>
    </>
  );
  const cls = "flex shrink-0 flex-col items-center active:scale-95 transition-transform";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  ) : (
    <Link href={href} className={cls}>{inner}</Link>
  );
}

/** A section heading inside a phone screen ("Recent orders · See all"). */
export function SectionTitle({ title, href, cta = "See all" }: { title: string; href?: string; cta?: string }) {
  return (
    <div className="flex items-baseline justify-between px-4 pb-2 pt-5">
      <h2 className="text-[17px] font-bold tracking-tight text-zinc-900 dark:text-white">{title}</h2>
      {href && (
        <Link href={href} className="text-[13px] font-semibold text-amber-600 dark:text-amber-400">
          {cta}
        </Link>
      )}
    </div>
  );
}
