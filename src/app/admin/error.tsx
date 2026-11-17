"use client";

// Shown instead of Next's bare "Application error" when an admin page fails.
// Admins see a hint for the usual cause (a database table or column the
// page needs isn't there yet) and the code to find the full error in logs.
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 dark:bg-red-950/40">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </span>
      <h1 className="mt-5 text-xl font-bold" style={{ color: "var(--text-primary)" }}>This admin page couldn&apos;t load</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        The most common cause is a database update that hasn&apos;t run yet. On the server, run <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[12px] dark:bg-zinc-800">npm run db:migrate</code>, then try again.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-500">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
        <Link href="/admin" className="rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
          Back to overview
        </Link>
      </div>
      {error.digest && <p className="mt-5 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>Error code: {error.digest} (search the server logs for it)</p>}
    </div>
  );
}
