"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import ShareDialog, { type ShareTarget } from "./ShareDialog";

/** A button that opens the share dialog. `compact` = icon only (tables). */
export default function ShareButton({ target, compact = false, className = "" }: { target: ShareTarget; compact?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Share ${target.title}`}
        title="Share"
        className={
          compact
            ? `rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 ${className}`
            : `inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 ${className}`
        }
      >
        <Share2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {!compact && "Share"}
      </button>
      {open && <ShareDialog target={target} onClose={() => setOpen(false)} />}
    </>
  );
}
