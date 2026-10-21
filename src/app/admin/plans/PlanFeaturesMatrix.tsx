"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { ALL_FEATURES, FEATURES, featuresForPlan, type Feature } from "@/lib/features-shared";

interface PlanLite {
  id: string;
  name: string;
  price_monthly: number;
  features?: string[] | null;
}

/**
 * Which paid features each plan includes. "Default" means: paid plan → all
 * features, Free plan → none. Customising a plan stores an explicit list.
 */
export default function PlanFeaturesMatrix({ plans }: { plans: PlanLite[] }) {
  const [state, setState] = useState<Record<string, string[] | null>>(() =>
    Object.fromEntries(plans.map((p) => [p.id, Array.isArray(p.features) ? p.features : null]))
  );
  const [saving, setSaving] = useState<string | null>(null);

  const effective = (p: PlanLite) => new Set(featuresForPlan({ isPro: p.price_monthly > 0, features: state[p.id] }));

  async function save(p: PlanLite, features: string[] | null) {
    setSaving(p.id);
    const res = await fetch(`/api/admin/plans/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features }),
    }).catch(() => null);
    setSaving(null);
    if (!res?.ok) return toast.error("Couldn't save plan features");
    setState((s) => ({ ...s, [p.id]: features }));
    toast.success(`${p.name} updated`);
  }

  function toggle(p: PlanLite, f: Feature) {
    const cur = effective(p);
    if (cur.has(f)) cur.delete(f);
    else cur.add(f);
    save(p, ALL_FEATURES.filter((x) => cur.has(x)));
  }

  if (!plans.length) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Plan features</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          What each plan unlocks. Changes apply to every store on that plan immediately — dashboards, APIs, storefronts and scheduled jobs.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Feature</th>
              {plans.map((p) => (
                <th key={p.id} className="px-4 py-3 text-center text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  <div>{p.name}</div>
                  <div className="mt-1 font-normal" style={{ color: "var(--text-muted)" }}>
                    {saving === p.id ? (
                      <Loader2 className="mx-auto h-3 w-3 animate-spin" />
                    ) : state[p.id] === null ? (
                      "Default"
                    ) : (
                      <button type="button" onClick={() => save(p, null)} className="underline">
                        Reset to default
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_FEATURES.map((f) => (
              <tr key={f} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-6 py-2.5">
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{FEATURES[f].label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{FEATURES[f].pitch}</p>
                </td>
                {plans.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer"
                      checked={effective(p).has(f)}
                      disabled={saving === p.id}
                      onChange={() => toggle(p, f)}
                      aria-label={`${FEATURES[f].label} on ${p.name}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
