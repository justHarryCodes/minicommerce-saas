"use client";

// Shown instead of Next's bare "Application error" when a dashboard page
// fails on the server. The digest matches the line in the server logs.
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 dark:bg-red-950/40">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-zinc-900 dark:text-white">This page couldn&apos;t load</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Something went wrong on our side. Your store and orders are safe. Try again, and if it keeps happening, send us the code below.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-500"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
        <Link href="/dashboard" className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
          Back to dashboard
        </Link>
      </div>
      {error.digest && <p className="mt-5 font-mono text-[11px] text-zinc-400">Error code: {error.digest}</p>}
    </div>
  );
}
