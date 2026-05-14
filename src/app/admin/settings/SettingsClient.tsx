"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import type { PlatformSettings } from "@/lib/admin-auth";

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2"
      style={{ background: enabled ? "var(--accent)" : "var(--bg-tertiary)" }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2.5 px-6 py-4 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <span className="text-lg">{icon}</span>
        <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
  children,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>{label}</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{description}</p>
        </div>
        <Toggle enabled={enabled} onChange={onChange} />
      </div>
      {enabled && children && (
        <div className="mt-4 pl-0 space-y-3">{children}</div>
      )}
    </div>
  );
}

function NumberInput({ label, value, onChange, prefix = "₦" }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs font-semibold w-40 shrink-0" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="flex items-center border rounded-lg overflow-hidden text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
        {prefix && (
          <span className="px-3 py-2 font-semibold border-r text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="px-3 py-2 w-28 outline-none text-sm font-semibold"
          style={{ color: "var(--text-primary)", background: "transparent" }}
        />
      </div>
    </div>
  );
}

export default function SettingsClient({ initialSettings }: { initialSettings: PlatformSettings }) {
  const [s, setS] = useState<PlatformSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setS((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save settings");
      } else {
        toast.success("Settings saved");
        setDirty(false);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black mb-1" style={{ color: "var(--text-primary)" }}>Platform Settings</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Control which features are active across the platform. All changes are logged.
        </p>
      </div>

      {/* Helper guide */}
      <div className="rounded-2xl border p-5 mb-6 flex gap-3"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
        <div className="text-xs leading-relaxed space-y-1.5" style={{ color: "var(--text-secondary)" }}>
          <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>What do these settings do?</p>
          <p><strong>Setup Fee</strong> — vendors must pay once before their store goes live. Good to set before launch to filter serious sellers.</p>
          <p><strong>Monthly Subscription</strong> — keeps vendors paying to stay on the platform. Only activates after the setup fee period ends.</p>
          <p><strong>NIN Verification</strong> — requires vendors to submit their National ID before selling. Adds trust but creates manual review work for you.</p>
          <p><strong>New Registrations</strong> — turn this off to pause all sign-ups (e.g. during maintenance). Existing vendors are unaffected.</p>
        </div>
      </div>

      {/* Live warning */}
      {dirty && (
        <div className="rounded-xl border px-4 py-3 mb-5 flex items-center gap-2.5 text-xs font-semibold"
          style={{ background: "#f59e0b15", borderColor: "#f59e0b40", color: "#d97706" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          You have unsaved changes — they won&apos;t take effect until you click Save Settings.
        </div>
      )}

      <div className="space-y-5">
        {/* Payments */}
        <Section title="Subscription & Payments" icon="💰">
          <ToggleRow
            label="Require setup fee"
            description="Vendors must pay a one-time setup fee before their store goes live and products are visible."
            enabled={s.require_setup_fee}
            onChange={(v) => update("require_setup_fee", v)}
          >
            <NumberInput label="Setup fee amount" value={s.setup_fee_amount} onChange={(v) => update("setup_fee_amount", v)} />
            <NumberInput label="Valid for (months)" value={s.setup_fee_duration_months} onChange={(v) => update("setup_fee_duration_months", v)} prefix="" />
          </ToggleRow>

          <div className="border-t" style={{ borderColor: "var(--border)" }} />

          <ToggleRow
            label="Require monthly subscription"
            description="After the setup fee period expires, vendors must pay a recurring monthly fee to continue selling."
            enabled={s.require_subscription}
            onChange={(v) => update("require_subscription", v)}
          >
            <NumberInput label="Monthly fee" value={s.monthly_fee_amount} onChange={(v) => update("monthly_fee_amount", v)} />
          </ToggleRow>
        </Section>

        {/* Verification */}
        <Section title="Vendor Verification" icon="✅">
          <ToggleRow
            label="Require NIN verification"
            description="Vendors must submit their National Identification Number (NIN) and have it manually verified by an admin before they can sell."
            enabled={s.require_nin_verification}
            onChange={(v) => update("require_nin_verification", v)}
          />
        </Section>

        {/* Plan subscriptions */}
        <Section title="Plan Subscriptions" icon="📋">
          <ToggleRow
            label="Require plan subscription"
            description="Vendors must subscribe to a plan to list products. When disabled (testing mode), all vendors can list freely regardless of plan."
            enabled={s.require_plan_subscription}
            onChange={(v) => update("require_plan_subscription", v)}
          />
          <div className="text-xs px-1" style={{ color: "var(--text-muted)" }}>
            Manage available plans and pricing on the{" "}
            <Link href="/admin/plans" className="underline font-semibold hover:opacity-80" style={{ color: "var(--accent)" }}>
              Plans page →
            </Link>
          </div>
        </Section>

        {/* Registrations */}
        <Section title="Store Registrations" icon="🏪">
          <ToggleRow
            label="Allow new store registrations"
            description="When disabled, new vendors cannot sign up or create stores. Existing stores are unaffected."
            enabled={s.allow_new_registrations}
            onChange={(v) => update("allow_new_registrations", v)}
          />
        </Section>
      </div>

      {/* Save bar */}
      <div className="mt-8 flex items-center justify-between p-5 rounded-2xl border"
        style={{ background: "var(--bg)", borderColor: dirty ? "var(--accent)" : "var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {dirty ? "Ready to save" : "All changes saved ✓"}
        </p>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
