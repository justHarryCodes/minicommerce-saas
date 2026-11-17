"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Bell, CheckCircle2, FileText, Loader2, Mail, Monitor, Send, Sparkles, Users } from "lucide-react";
import { CAMPAIGN_TEMPLATES, TEMPLATE_GROUPS, templateById, type CampaignTemplate } from "@/lib/admin/campaign-templates";

// Admin -> Campaigns -> New. Audience on the left builds a live count;
// the message and a preview sit beside it.

type Channel = "email" | "push" | "inapp";
type Opt = { name: string; n: number };
interface Options {
  categories: Opt[];
  plans: { id: string; name: string; price_monthly: number }[];
  states: Opt[];
  activities: { id: string; label: string }[];
  emailReady: boolean;
}

const CTA_SHORTCUTS = [
  { label: "Dashboard", url: "/dashboard" },
  { label: "Add product", url: "/dashboard/products/new" },
  { label: "Plans", url: "/dashboard/billing" },
  { label: "WhatsApp shop", url: "/dashboard/whatsapp" },
];

function Chips<T extends string>({ items, value, onChange, render }: { items: { id: T; label: string; hint?: string | number }[]; value: T[]; onChange: (v: T[]) => void; render?: never }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => {
        const on = value.includes(it.id);
        return (
          <button
            key={it.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== it.id) : [...value, it.id])}
            className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${on ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900" : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"}`}
          >
            {it.label}
            {it.hint != null && <span className="ml-1 opacity-60">{it.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

const card = "rounded-xl border p-4";
const cardStyle = { background: "var(--bg)", borderColor: "var(--border)" };
const input = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400";
const inputStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" };
const label = "mb-1.5 block text-[12px] font-semibold uppercase tracking-wide";

export default function CampaignBuilder({ adminEmail, storeIds, templateId }: { adminEmail: string; storeIds: string[]; templateId: string | null }) {
  const router = useRouter();
  const start = templateById(templateId);
  const [tpl, setTpl] = useState<string | null>(start?.id ?? null);
  const [opts, setOpts] = useState<Options | null>(null);
  const [channels, setChannels] = useState<Channel[]>(start ? [...start.channels] : ["email", "inapp"]);
  const [categories, setCategories] = useState<string[]>([]);
  const [plans, setPlans] = useState<string[]>(start && !storeIds.length ? [...(start.audience.plans ?? [])] : []);
  const [activity, setActivity] = useState<string[]>(start && !storeIds.length ? [...(start.audience.activity ?? [])] : []);
  const [states, setStates] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>(storeIds);
  const [name, setName] = useState<string>(start?.name ?? "");
  const [subject, setSubject] = useState<string>(start?.subject ?? "");
  const [headline, setHeadline] = useState<string>(start?.headline ?? "");
  const [body, setBody] = useState<string>(start?.body ?? "");
  const [ctaLabel, setCtaLabel] = useState<string>(start?.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState<string>(start?.ctaUrl ?? "");
  const [count, setCount] = useState<number | null>(null);
  const [sample, setSample] = useState<{ id: string; name: string; primary_category: string | null }[]>([]);
  const [busy, setBusy] = useState<"test" | "send" | null>(null);
  const [progress, setProgress] = useState<{ id: string; size: number; sent: number; failed: number; status: string } | null>(null);
  const reqId = useRef(0);

  /** Fill the builder from a template (keeps stores picked in Leads). */
  function apply(t: CampaignTemplate | null) {
    setTpl(t?.id ?? null);
    if (!t) {
      setName(""); setSubject(""); setHeadline(""); setBody(""); setCtaLabel(""); setCtaUrl("");
      return;
    }
    setName(t.name);
    setSubject(t.subject);
    setHeadline(t.headline);
    setBody(t.body);
    setCtaLabel(t.ctaLabel);
    setCtaUrl(t.ctaUrl);
    setChannels([...t.channels]);
    if (!picked.length) {
      setCategories([]);
      setStates([]);
      setPlans([...(t.audience.plans ?? [])]);
      setActivity([...(t.audience.activity ?? [])]);
    }
  }

  useEffect(() => {
    fetch("/api/admin/campaigns/builder").then((r) => r.json()).then(setOpts).catch(() => toast.error("Couldn't load audience options"));
  }, []);

  const audience = useMemo(
    () => ({ categories, plans, activity, states, ...(picked.length ? { storeIds: picked } : {}) }),
    [categories, plans, activity, states, picked],
  );

  // Live audience size
  useEffect(() => {
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const res = await fetch("/api/admin/campaigns/builder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", audience }) }).catch(() => null);
      const d = res?.ok ? await res.json() : null;
      if (id !== reqId.current) return;
      setCount(d?.count ?? null);
      setSample(d?.sample ?? []);
    }, 350);
    return () => clearTimeout(t);
  }, [audience]);

  // Progress while sending
  useEffect(() => {
    if (!progress || progress.status !== "sending") return;
    const t = setInterval(async () => {
      const d = await fetch(`/api/admin/campaigns/${progress.id}`).then((r) => r.json()).catch(() => null);
      if (d) setProgress((p) => (p ? { ...p, sent: d.sent, failed: d.failed, status: d.status } : p));
    }, 1500);
    return () => clearInterval(t);
  }, [progress]);

  const content = { name: name || subject || headline, subject: subject || headline, headline, body, ctaLabel: ctaLabel || null, ctaUrl: ctaUrl || null, channels };
  const ready = channels.length > 0 && headline.trim().length > 1 && body.trim().length > 4 && (!channels.includes("email") || (subject || headline).trim().length > 1);

  async function post(action: "test" | "send") {
    setBusy(action);
    try {
      const res = await fetch("/api/admin/campaigns/builder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "test" ? { action, content } : { action, content, audience }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed");
      if (action === "test") toast.success(`Test sent to ${d.to}`);
      else {
        setProgress({ id: d.id, size: d.size, sent: 0, failed: 0, status: "sending" });
        toast.success(`Sending to ${d.size} store${d.size === 1 ? "" : "s"}…`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const fill = (s: string) => s.replace(/\{store\}/gi, sample[0]?.name ?? "Amaka Styles").replace(/\{name\}/gi, "Amaka");
  const chOpts: { id: Channel; label: string; Icon: typeof Mail; hint: string }[] = [
    { id: "email", label: "Email", Icon: Mail, hint: opts && !opts.emailReady ? "not configured" : "with unsubscribe" },
    { id: "push", label: "Push", Icon: Bell, hint: "app + dashboard" },
    { id: "inapp", label: "Dashboard banner", Icon: Monitor, hint: "shown for 30 days" },
  ];

  if (progress) {
    const done = progress.status !== "sending";
    const total = progress.size * channels.length;
    const pct = total ? Math.round(((progress.sent + progress.failed) / total) * 100) : 100;
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        {done ? <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /> : <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-500" />}
        <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{done ? "Campaign sent" : "Sending…"}</h2>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {progress.sent} delivered{progress.failed ? ` · ${progress.failed} skipped (unsubscribed, no email or failed)` : ""} · {progress.size} store{progress.size === 1 ? "" : "s"}
        </p>
        <button type="button" onClick={() => router.push("/admin/campaigns")} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
          Back to campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        {/* Templates */}
        <section className={card} style={cardStyle}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 font-bold" style={{ color: "var(--text-primary)" }}><Sparkles className="h-4 w-4 text-amber-500" /> Start from a template</h2>
            <button type="button" onClick={() => apply(null)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${tpl === null ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
              <FileText className="h-3.5 w-3.5" /> Blank
            </button>
          </div>
          <div className="space-y-3">
            {TEMPLATE_GROUPS.map((g) => (
              <div key={g.id}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{g.label} <span className="normal-case tracking-normal opacity-70">· {g.hint}</span></p>
                <div className="grid gap-1.5 sm:grid-cols-2 2xl:grid-cols-3">
                  {CAMPAIGN_TEMPLATES.filter((t) => t.group === g.id).map((t) => {
                    const on = tpl === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => apply(t)}
                        className={`rounded-lg border px-3 py-2 text-left transition-colors ${on ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : "hover:border-zinc-400"}`}
                        style={on ? undefined : { borderColor: "var(--border)" }}
                      >
                        <span className="block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{t.title}</span>
                        <span className="block truncate text-[11px]" style={{ color: "var(--text-muted)" }}>{t.goal}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Audience */}
        <section className={card} style={cardStyle}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>1. Audience</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[13px] font-bold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <Users className="h-3.5 w-3.5" /> {count === null ? "…" : `${count.toLocaleString()} store${count === 1 ? "" : "s"}`}
            </span>
          </div>
          {picked.length > 0 && (
            <p className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-sky-50 px-3 py-2 text-[13px] text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
              {picked.length} store{picked.length === 1 ? "" : "s"} picked from Leads (filters below narrow them further)
              <button type="button" onClick={() => setPicked([])} className="font-semibold underline">Clear</button>
            </p>
          )}
          <div className="space-y-4">
            <div>
              <p className={label} style={{ color: "var(--text-muted)" }}>Category</p>
              {opts ? <Chips items={opts.categories.map((c) => ({ id: c.name, label: c.name, hint: c.n }))} value={categories} onChange={setCategories} /> : <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <div>
              <p className={label} style={{ color: "var(--text-muted)" }}>Plan</p>
              <Chips
                items={[
                  { id: "free", label: "Free" },
                  { id: "paid", label: "Any paid plan" },
                  { id: "lapsed", label: "Lapsed (expired)" },
                  ...(opts?.plans.filter((p) => p.price_monthly > 0).map((p) => ({ id: p.id, label: p.name })) ?? []),
                ]}
                value={plans}
                onChange={setPlans}
              />
            </div>
            <div>
              <p className={label} style={{ color: "var(--text-muted)" }}>Activity <span className="normal-case tracking-normal opacity-70">(any of)</span></p>
              <Chips items={(opts?.activities ?? []).map((a) => ({ id: a.id, label: a.label }))} value={activity} onChange={setActivity} />
            </div>
            <div>
              <p className={label} style={{ color: "var(--text-muted)" }}>Location <span className="normal-case tracking-normal opacity-70">(where most of the store&apos;s orders go)</span></p>
              {opts && opts.states.length ? <Chips items={opts.states.map((s) => ({ id: s.name, label: s.name, hint: s.n }))} value={states} onChange={setStates} /> : <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>No delivery locations yet.</p>}
            </div>
          </div>
          <p className="mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>Nothing selected in a row = everyone. Rows combine (e.g. Fashion + Free + Lagos).</p>
        </section>

        {/* Message */}
        <section className={card} style={cardStyle}>
          <h2 className="mb-3 font-bold" style={{ color: "var(--text-primary)" }}>2. Channels &amp; message</h2>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            {chOpts.map(({ id, label: l, Icon, hint }) => {
              const on = channels.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChannels(on ? channels.filter((c) => c !== id) : [...channels, id])}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left ${on ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : ""}`}
                  style={on ? undefined : { borderColor: "var(--border)" }}
                >
                  <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--text-primary)" }} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{l}</span>
                    <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>{hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid gap-3">
            <div>
              <label className={label} style={{ color: "var(--text-muted)" }} htmlFor="c-name">Campaign name (internal)</label>
              <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fashion stores · Black Friday" className={input} style={inputStyle} />
            </div>
            {channels.includes("email") && (
              <div>
                <label className={label} style={{ color: "var(--text-muted)" }} htmlFor="c-subject">Email subject</label>
                <input id="c-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="{store}, Black Friday is coming" className={input} style={inputStyle} />
              </div>
            )}
            <div>
              <label className={label} style={{ color: "var(--text-muted)" }} htmlFor="c-head">Headline</label>
              <input id="c-head" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Get ready for Black Friday, {name}" className={input} style={inputStyle} />
            </div>
            <div>
              <label className={label} style={{ color: "var(--text-muted)" }} htmlFor="c-body">Message</label>
              <textarea id="c-body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder={"Write to your vendors. Use {store} and {name} to personalise, **bold** for emphasis.\n\nBlank line = new paragraph."} className={input} style={inputStyle} />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
              <div>
                <label className={label} style={{ color: "var(--text-muted)" }} htmlFor="c-cta">Button text</label>
                <input id="c-cta" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="See plans" className={input} style={inputStyle} />
              </div>
              <div>
                <label className={label} style={{ color: "var(--text-muted)" }} htmlFor="c-url">Button link</label>
                <input id="c-url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="/dashboard/billing or https://…" className={input} style={inputStyle} />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {CTA_SHORTCUTS.map((c) => (
                    <button key={c.url} type="button" onClick={() => setCtaUrl(c.url)} className="rounded px-1.5 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">{c.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Preview + send */}
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <section className={card} style={cardStyle}>
          <p className={label} style={{ color: "var(--text-muted)" }}>Preview</p>
          <div className="rounded-lg border bg-white p-4 text-zinc-900" style={{ borderColor: "var(--border)" }}>
            {channels.includes("email") && <p className="mb-2 text-[11px] text-zinc-500">Subject: <strong className="text-zinc-800">{fill(subject || headline) || "…"}</strong></p>}
            <p className="text-base font-black leading-snug">{fill(headline) || "Your headline"}</p>
            <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-zinc-600">
              {(fill(body) || "Your message…").split(/\n{2,}/).map((p, i) => (
                <p key={i} dangerouslySetInnerHTML={{ __html: p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>") }} />
              ))}
            </div>
            {ctaLabel && <span className="mt-3 inline-block rounded-lg bg-amber-400 px-3 py-1.5 text-[13px] font-bold text-black">{ctaLabel}</span>}
          </div>
          {sample.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Includes</p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                {sample.slice(0, 6).map((s) => s.name).join(", ")}
                {count && count > 6 ? ` and ${count - 6} more` : ""}
              </p>
            </div>
          )}
        </section>

        <section className={`${card} space-y-2`} style={cardStyle}>
          {channels.includes("email") && (
            <button type="button" onClick={() => post("test")} disabled={!ready || !!busy || (opts ? !opts.emailReady : false)} className="flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold disabled:opacity-50" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
              {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send test to {adminEmail}
            </button>
          )}
          <button
            type="button"
            onClick={() => count && confirm(`Send "${content.name || "this campaign"}" to ${count} store${count === 1 ? "" : "s"} by ${channels.join(", ")}?`) && post("send")}
            disabled={!ready || !!busy || !count}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 py-2.5 text-sm font-bold text-black hover:bg-amber-500 disabled:opacity-50"
          >
            {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send to {count ?? "…"} store{count === 1 ? "" : "s"}
          </button>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Emails skip vendors who unsubscribed from offers or whose address bounced. <Link href="/admin/leads" className="underline">Pick stores from Leads</Link>
          </p>
        </section>
      </aside>
    </div>
  );
}
