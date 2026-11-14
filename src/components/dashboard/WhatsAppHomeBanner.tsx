import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { queryOne } from "@/lib/db";
import { whatsappAvailable } from "@/lib/meta/config";

// Dashboard home: the WhatsApp shop add-on, right under the setup checklist.
// Not connected -> a big green invitation. Live -> a slim status strip.

export default async function WhatsAppHomeBanner({ storeId }: { storeId: string }) {
  const available = whatsappAvailable();
  const conn = available
    ? await queryOne<{ status: string; display_phone: string | null; chats: number }>(
        `SELECT c.status, c.display_phone,
                (SELECT COUNT(*)::int FROM social_conversations v WHERE v.store_id = c.store_id AND v.channel = 'whatsapp') AS chats
           FROM social_connections c WHERE c.store_id = $1 AND c.channel = 'whatsapp'`,
        [storeId],
      ).catch(() => null) // tables not created yet = not connected
    : null;

  if (conn) {
    return (
      <Link href="/dashboard/whatsapp" className="flex items-center gap-3 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-2.5 text-[13px] hover:bg-[#25D366]/15">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
          <MessageCircle className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200">
          <strong>WhatsApp shop {conn.status === "paused" ? "is paused" : "is live"}</strong>
          {conn.display_phone ? ` on ${conn.display_phone}` : ""} · {conn.chats.toLocaleString()} chat{conn.chats === 1 ? "" : "s"}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" />
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard/whatsapp"
      className="group flex flex-col gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-[#075e54] via-[#128c7e] to-[#25D366] p-4 text-white sm:flex-row sm:items-center sm:p-5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
        <MessageCircle className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="text-base">Sell on WhatsApp</strong>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">{available ? "New add-on" : "Coming soon"}</span>
        </span>
        <span className="mt-0.5 block text-[13px] text-white/85">
          Customers browse your products, add to cart and check out right inside WhatsApp. Your catalog syncs automatically.
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#075e54] transition-transform group-hover:translate-x-0.5">
        {available ? "Connect WhatsApp" : "See how it works"} <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
