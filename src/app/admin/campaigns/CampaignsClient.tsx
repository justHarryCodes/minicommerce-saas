"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Mail, Send, Users } from "lucide-react";

interface Data {
  audience: number;
  preview: { subject: string; html: string };
  emailReady: boolean;
}

export default function CampaignsClient({ adminEmail }: { adminEmail: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<"test" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/campaigns/upgrade");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't load");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load");
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function run(mode: "test" | "send") {
    if (mode === "send" && !confirm(`Send the upgrade email to ${data?.audience ?? 0} vendors now? (Up to 200 per click.)`)) return;
    setBusy(mode);
    try {
      const res = await fetch("/api/admin/campaigns/upgrade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      if (mode === "test") toast.success(`Test sent to ${json.to}`);
      else {
        toast.success(`Sent to ${json.sent} vendor${json.sent === 1 ? "" : "s"}${json.failed ? `, ${json.failed} failed` : ""}`);
        void load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="mb-1 text-3xl font-black" style={{ color: "var(--text-primary)" }}>Campaigns</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Email vendors on the Free plan about what Pro and Business give them. Prices and features come from your Plans.
        </p>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-2xl border p-5" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <p className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              <Mail className="h-4 w-4" style={{ color: "var(--accent)" }} /> Upgrade to Pro / Business
            </p>
            <p className="mt-3 flex items-center gap-2 text-3xl font-black" style={{ color: "var(--text-primary)" }}>
              <Users className="h-6 w-6" style={{ color: "var(--text-muted)" }} /> {data ? data.audience : "…"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>vendors will receive it now</p>
            <ul className="mt-4 space-y-1.5 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              <li>• Active stores on Free (or whose paid plan ended), 3+ days old</li>
              <li>• Never the same store twice within 30 days</li>
              <li>• Skips anyone who unsubscribed, bounced or marked Duka as spam</li>
              <li>• Each email has an unsubscribe link and Gmail&apos;s one-click unsubscribe</li>
            </ul>

            {data && !data.emailReady && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Email isn&apos;t configured on the server (RESEND_API_KEY / EMAIL_FROM).</p>
            )}

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => run("test")}
                disabled={!!busy || !data?.emailReady}
                className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send test to {adminEmail}
              </button>
              <button
                type="button"
                onClick={() => run("send")}
                disabled={!!busy || !data?.emailReady || !data?.audience}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50"
                style={{ background: "var(--accent)" }}
              >
                {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {data?.audience ? `Send to ${Math.min(data.audience, 200)} vendors` : "Nobody to send to right now"}
              </button>
              {data && data.audience > 200 && (
                <p className="text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
                  Sends 200 at a time to protect your sender reputation. Click again for the rest.
                </p>
              )}
            </div>
          </div>
        </aside>

        <section className="overflow-hidden rounded-2xl border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
          <div className="border-b px-5 py-3 text-sm" style={{ borderColor: "var(--border)" }}>
            <span style={{ color: "var(--text-muted)" }}>Subject: </span>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{data?.preview.subject ?? "…"}</span>
          </div>
          {data ? (
            <iframe title="Email preview" srcDoc={data.preview.html} sandbox="" className="h-[900px] w-full bg-white" />
          ) : (
            <div className="flex h-96 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
