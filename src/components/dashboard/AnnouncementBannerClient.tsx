"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { themeById } from "@/lib/email-themes";
import { MessageBadge, MessageBody } from "@/components/marketing/MessageElements";

export default function AnnouncementBannerClient({ campaignId, headline, body, theme, cta }: { campaignId: string; headline: string; body: string; theme: string | null; cta: { label: string; url: string } | null }) {
  const [open, setOpen] = useState(true);
  const [more, setMore] = useState(false);
  if (!open) return null;
  const th = themeById(theme);
  const dismiss = () => {
    setOpen(false);
    fetch("/api/dashboard/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId }) }).catch(() => {});
  };
  // Links to our own site open in place; others in a new tab
  const own = cta?.url.startsWith("/") || /^https:\/\/(www\.)?dukanigeria\.com/.test(cta?.url ?? "");
  const href = cta ? cta.url.replace(/^https:\/\/(www\.)?dukanigeria\.com/, "") || "/" : "#";
  return (
    <div className="relative mb-3 mt-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 lg:mt-0" role="status">
      <div className="h-1" style={{ background: th.accent }} />
      <div className="p-4 pr-11">
        <MessageBadge theme={th} />
        <p className="mt-2 text-[15px] font-black leading-snug text-zinc-900 dark:text-white">{headline}</p>
        {/* Elements are designed for a light card; in dark mode they sit on a light inset */}
        <div className={`relative mt-2 overflow-hidden rounded-xl dark:bg-white dark:p-3 ${more ? "" : "max-h-[132px]"}`}>
          <MessageBody body={body} theme={th} compact />
          {!more && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {cta && (
            <a
              href={own ? href : cta.url}
              {...(own ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              onClick={() => fetch("/api/dashboard/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId }) }).catch(() => {})}
              className="inline-block rounded-xl px-4 py-2 text-[13px] font-extrabold"
              style={{ background: th.accent, color: th.onAccent }}
            >
              {cta.label} →
            </a>
          )}
          <button type="button" onClick={() => setMore((v) => !v)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            {more ? "Show less" : "Read more"} <ChevronDown className={`h-3.5 w-3.5 transition ${more ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-3 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
