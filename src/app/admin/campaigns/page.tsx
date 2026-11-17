import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Mail, Megaphone, Monitor, Plus } from "lucide-react";
import { verifyAdminSession } from "@/lib/admin-auth";
import { listCampaigns } from "@/lib/admin/campaigns";
import CampaignsClient from "./CampaignsClient";
import { CAMPAIGN_TEMPLATES, TEMPLATE_GROUPS } from "@/lib/admin/campaign-templates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaigns" };

const CH = { email: Mail, push: Bell, inapp: Monitor } as const;
const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function CampaignsPage() {
  const admin = await verifyAdminSession();
  if (!admin) redirect("/admin/login");
  const campaigns = await listCampaigns().catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Campaigns</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Reach vendors by category, plan, activity and location: email, push, or an announcement in their dashboard.</p>
        </div>
        <Link href="/admin/campaigns/new" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-black hover:bg-amber-500">
          <Plus className="h-4 w-4" /> New campaign
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
        {campaigns.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                  <th className="px-4 py-2 font-medium">Campaign</th>
                  <th className="px-4 py-2 font-medium">Channels</th>
                  <th className="px-4 py-2 text-right font-medium">Audience</th>
                  <th className="px-4 py-2 text-right font-medium">Delivered</th>
                  <th className="hidden px-4 py-2 font-medium md:table-cell">Sent</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {c.status === "sending" ? "Sending…" : c.status === "sent" ? "Sent" : c.status} · by {c.created_by ?? "admin"}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        {c.channels.map((ch) => {
                          const I = CH[ch as keyof typeof CH] ?? Megaphone;
                          return <I key={ch} className="h-4 w-4" aria-label={ch} />;
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: "var(--text-primary)" }}>{c.audience_size}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span style={{ color: "var(--text-primary)" }}>{c.sent}</span>
                      {c.failed > 0 && <span className="ml-1 text-[11px] text-red-500">({c.failed} failed)</span>}
                    </td>
                    <td className="hidden px-4 py-2.5 md:table-cell" style={{ color: "var(--text-secondary)" }}>{when(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <Megaphone className="mx-auto h-8 w-8" style={{ color: "var(--text-muted)" }} />
            <p className="mt-2 font-semibold" style={{ color: "var(--text-primary)" }}>No campaigns yet</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Create one, or start from a lead list in Leads.</p>
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Templates · {CAMPAIGN_TEMPLATES.length} ready to send</h3>
        {TEMPLATE_GROUPS.map((g) => (
          <div key={g.id}>
            <p className="mb-1.5 text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>{g.label} <span className="font-normal" style={{ color: "var(--text-muted)" }}>· {g.hint}</span></p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {CAMPAIGN_TEMPLATES.filter((t) => t.group === g.id).map((t) => (
                <Link key={t.id} href={`/admin/campaigns/new?template=${t.id}`} className="group rounded-xl border p-3 transition-colors hover:border-amber-400" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{t.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[12px]" style={{ color: "var(--text-muted)" }}>{t.goal}</p>
                  <div className="mt-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    {t.channels.map((ch) => {
                      const I = CH[ch as keyof typeof CH] ?? Megaphone;
                      return <I key={ch} className="h-3.5 w-3.5" aria-label={ch} />;
                    })}
                    <span className="ml-auto text-[11px] font-semibold text-amber-600 opacity-0 transition-opacity group-hover:opacity-100">Use →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Ready-made: Upgrade to Pro / Business</h3>
        <CampaignsClient adminEmail={admin.email} />
      </section>
    </div>
  );
}
