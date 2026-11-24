import Link from "next/link";
import { Sparkles } from "lucide-react";

/** A slim note on pages the Free plan can use within a limit ("1 of 1 codes in use"). */
export default function FreeLimitNote({ children, full = false }: { children: React.ReactNode; full?: boolean }) {
  return (
    <Link
      href="/dashboard/billing"
      className={`mb-3 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
        full
          ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
          : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
        <Sparkles className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      <span className="shrink-0 font-bold text-amber-700 underline underline-offset-2 dark:text-amber-400">Go Pro</span>
    </Link>
  );
}
