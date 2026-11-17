"use client";

import { useState } from "react";
import { Megaphone, X } from "lucide-react";

export default function AnnouncementBannerClient({ campaignId, headline, body, cta }: { campaignId: string; headline: string; body: string; cta: { label: string; url: string } | null }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const dismiss = () => {
    setOpen(false);
    fetch("/api/dashboard/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId }) }).catch(() => {});
  };
  // Links to our own site open in place; others in a new tab
  const own = cta?.url.startsWith("/") || /^https:\/\/(www\.)?dukanigeria\.com/.test(cta?.url ?? "");
  const href = cta ? cta.url.replace(/^https:\/\/(www\.)?dukanigeria\.com/, "") || "/" : "#";
  return (
    <div className="relative mb-3 mt-3 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 pr-10 dark:border-amber-900/50 dark:bg-amber-950/30 lg:mt-0" role="status">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-black">
        <Megaphone className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-zinc-900 dark:text-white">{headline}</p>
        <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-[13px] text-zinc-600 dark:text-zinc-300">{body}</p>
        {cta && (
          <a href={own ? href : cta.url} {...(own ? {} : { target: "_blank", rel: "noopener noreferrer" })} onClick={() => fetch("/api/dashboard/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId }) }).catch(() => {})} className="mt-2 inline-block rounded-lg bg-zinc-900 px-3 py-1.5 text-[13px] font-semibold text-white dark:bg-white dark:text-zinc-900">
            {cta.label}
          </a>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 rounded-lg p-1.5 text-zinc-400 hover:bg-amber-100 hover:text-zinc-700 dark:hover:bg-amber-900/30">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
