"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AlertCircle, CheckCircle2, Clock, Copy, Globe, Loader2, RefreshCw, Trash2 } from "lucide-react";

interface DnsRecord {
  type: "CNAME" | "TXT";
  name: string;
  value: string;
  purpose: string;
}

interface Domain {
  hostname: string;
  status: "pending" | "active" | "failed";
  ssl_status: string | null;
  verification: DnsRecord[];
  last_error: string | null;
  last_checked_at: string | null;
  apex: boolean;
}

interface State {
  available: boolean;
  isPro: boolean;
  target: string;
  domain: Domain | null;
}

function CopyField({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value).then(() => toast.success("Copied"))}
      className="group flex w-full items-center justify-between gap-2 rounded-lg bg-surface-50 px-2.5 py-1.5 text-left font-mono text-xs text-surface-800 hover:bg-surface-100 dark:bg-surface-800 dark:text-surface-100 dark:hover:bg-surface-700"
    >
      <span className="break-all">{value}</span>
      <Copy className="h-3.5 w-3.5 shrink-0 text-surface-400 group-hover:text-surface-700 dark:group-hover:text-white" />
    </button>
  );
}

export default function CustomDomainSettings({ freeAddress }: { freeAddress: string }) {
  const [state, setState] = useState<State | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<"add" | "check" | "remove" | null>(null);

  useEffect(() => {
    fetch("/api/stores/domain")
      .then((r) => r.json())
      .then(setState)
      .catch(() => setState({ available: false, isPro: false, target: "", domain: null }));
  }, []);

  async function call(method: "POST" | "PATCH" | "DELETE", kind: "add" | "check" | "remove", body?: unknown) {
    setBusy(kind);
    try {
      const res = await fetch("/api/stores/domain", {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      setState((s) => (s ? { ...s, domain: kind === "remove" ? null : json.domain } : s));
      if (kind === "add") toast.success("Domain added — now update your DNS");
      if (kind === "check") toast.success(json.domain?.status === "active" ? "Your domain is live! 🎉" : "Still waiting for DNS — this can take up to a few hours");
      if (kind === "remove") {
        toast.success("Domain removed");
        setInput("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const d = state?.domain;

  return (
    <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Custom domain
        </h2>
        {state && !state.isPro && <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-accent-800 dark:bg-accent-950 dark:text-accent-300">PRO</span>}
      </div>
      <p className="text-sm text-surface-500 dark:text-surface-400">
        Use your own address, like <span className="font-medium text-surface-700 dark:text-surface-200">shop.yourbrand.com</span>. Your free address{" "}
        <span className="font-medium text-surface-700 dark:text-surface-200">{freeAddress}</span> keeps working too.
      </p>

      {!state ? (
        <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
      ) : !state.available ? (
        <p className="flex items-start gap-2 rounded-xl bg-surface-50 px-4 py-3 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" /> Custom domains are coming soon.
        </p>
      ) : !d ? (
        state.isPro ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) call("POST", "add", { hostname: input });
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="shop.yourbrand.com"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm font-mono"
            />
            <button
              type="submit"
              disabled={busy === "add" || !input.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-accent-400 px-5 py-3 text-sm font-bold text-black hover:bg-accent-500 disabled:opacity-50"
            >
              {busy === "add" && <Loader2 className="h-4 w-4 animate-spin" />} Connect domain
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl bg-surface-50 px-4 py-3 dark:bg-surface-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-surface-600 dark:text-surface-300">Upgrade to Pro to connect your own domain.</p>
            <Link href="/dashboard/billing" className="w-fit rounded-xl bg-accent-400 px-4 py-2 text-sm font-bold text-black hover:bg-accent-500">
              See plans
            </Link>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-200 px-4 py-3 dark:border-surface-700">
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold text-surface-900 dark:text-white">{d.hostname}</p>
              {d.status === "active" ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Live with SSL
                </p>
              ) : d.status === "failed" ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" /> Couldn&apos;t verify — check the DNS record below
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5" /> Waiting for DNS{d.ssl_status && d.ssl_status !== "active" ? " · certificate pending" : ""}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {d.status === "active" ? (
                <a
                  href={`https://${d.hostname}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-semibold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
                >
                  Visit
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => call("PATCH", "check")}
                  disabled={!!busy}
                  className="flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-semibold text-surface-700 hover:bg-surface-50 disabled:opacity-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
                >
                  {busy === "check" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Check status
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Disconnect ${d.hostname}? Your store will only be reachable at ${freeAddress}.`)) call("DELETE", "remove");
                }}
                disabled={!!busy}
                aria-label="Remove domain"
                className="rounded-lg p-1.5 text-surface-400 hover:text-red-500 disabled:opacity-50"
              >
                {busy === "remove" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {d.status !== "active" && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Add this record where you manage your domain (e.g. Namecheap, GoDaddy, Whogohost, Cloudflare):
              </p>
              {d.verification.map((r, i) => (
                <div key={`${r.type}-${r.name}`} className="rounded-xl border border-surface-200 p-3 dark:border-surface-700">
                  <p className="mb-2 text-xs text-surface-500 dark:text-surface-400">
                    <span className="mr-1.5 rounded bg-surface-100 px-1.5 py-0.5 font-mono font-bold text-surface-700 dark:bg-surface-800 dark:text-surface-200">{r.type}</span>
                    {r.purpose}
                    {i > 0 && " (only if the CNAME alone isn't enough)"}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-[80px_1fr] sm:items-center">
                    <span className="text-xs text-surface-400">Name / Host</span>
                    <CopyField value={r.name} />
                    <span className="text-xs text-surface-400">{r.type === "CNAME" ? "Points to" : "Value"}</span>
                    <CopyField value={r.value} />
                  </div>
                </div>
              ))}
              {d.apex && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Bare domains (yourbrand.com) need a DNS host that supports CNAME flattening or ALIAS records. If yours doesn&apos;t,
                  connect <strong className="mx-1">www.{d.hostname}</strong> instead.
                </p>
              )}
              <p className="text-xs text-surface-400">
                DNS changes usually take a few minutes, sometimes a few hours. We&apos;ll set up SSL automatically once it&apos;s in place.
                {d.last_error && <span className="mt-1 block text-red-500">Last check: {d.last_error}</span>}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
