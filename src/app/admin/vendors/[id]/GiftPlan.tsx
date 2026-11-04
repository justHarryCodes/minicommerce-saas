"use client";

// Gift a paid plan (Pro, Business, …) for 1, 3, 6 or 12 months, or end the
// current plan. Shows the resulting end date before anything is changed.
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Gift, Loader2 } from "lucide-react";
import { InfoTip } from "@/app/admin/InfoTip";
import { GIFT_MONTHS, giftPeriod, type GiftMonths } from "@/lib/plan-gift";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
}

const fmt = (d: Date | string) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
const MONTH_LABEL: Record<GiftMonths, string> = { 1: "1 month", 3: "3 months", 6: "6 months", 12: "1 year" };

export default function GiftPlan({
  storeId,
  plans,
  currentPlanId,
  currentPlanName,
  expiresAt,
}: {
  storeId: string;
  /** Paid, active plans */
  plans: Plan[];
  currentPlanId: string | null;
  currentPlanName: string;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [months, setMonths] = useState<GiftMonths>(1);
  const [busy, setBusy] = useState<"gift" | "end" | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const plan = plans.find((p) => p.id === planId);
  const active = !!expiresAt && new Date(expiresAt) > new Date();
  const onPaid = active && plans.some((p) => p.id === currentPlanId);
  const preview = plan ? giftPeriod({ planId: currentPlanId, expiresAt }, plan.id, months) : null;
  const replacesOther = onPaid && currentPlanId !== planId;

  async function send(body: { action: "gift_plan" | "end_plan" } & Record<string, unknown>, label: string) {
    setBusy(body.action === "end_plan" ? "end" : "gift");
    try {
      const res = await fetch(`/api/admin/vendors/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Something went wrong");
      toast.success(label);
      setConfirmEnd(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const chip = (on: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${on ? "ring-2 ring-offset-0" : "opacity-80 hover:opacity-100"}`;
  const chipStyle = (on: boolean) => ({
    borderColor: on ? "var(--accent, #f59e0b)" : "var(--border)",
    color: "var(--text-primary)",
    background: on ? "color-mix(in srgb, var(--accent, #f59e0b) 12%, transparent)" : "transparent",
  });

  return (
    <div className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
        <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Gift a plan</h3>
        <InfoTip content="Give this store a paid plan for free. When it runs out the store goes back to the Free plan automatically. Gifting the plan they already have adds the time on top." />
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Now on <strong style={{ color: "var(--text-primary)" }}>{onPaid ? currentPlanName : "Free"}</strong>
        {onPaid && expiresAt ? ` until ${fmt(expiresAt)}` : ""}
      </p>

      {plans.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No paid plans are active.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Plan">
            {plans.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={planId === p.id} onClick={() => setPlanId(p.id)} className={chip(planId === p.id)} style={chipStyle(planId === p.id)}>
                {p.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Length">
            {GIFT_MONTHS.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={months === m} onClick={() => setMonths(m)} className={chip(months === m)} style={chipStyle(months === m)}>
                {MONTH_LABEL[m]}
              </button>
            ))}
          </div>

          {preview && plan && (
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {preview.extended
                ? `Adds ${MONTH_LABEL[months]} to their ${plan.name} plan — now ends ${fmt(preview.expiresAt)}.`
                : `${plan.name} from today until ${fmt(preview.expiresAt)}.`}
              {replacesOther && ` This replaces their ${currentPlanName} plan (remaining time is not carried over).`}
              {` Worth ₦${(Number(plan.price_monthly) * months).toLocaleString("en-NG")}.`}
            </p>
          )}

          <button
            type="button"
            disabled={!plan || busy !== null}
            onClick={() => send({ action: "gift_plan", planId, months }, `${plan?.name} gifted for ${MONTH_LABEL[months]}`)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{ background: "var(--text-primary)", color: "var(--bg)" }}
          >
            {busy === "gift" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
            Gift {plan?.name ?? "plan"} · {MONTH_LABEL[months]}
          </button>
        </>
      )}

      {onPaid && (
        <div className="pt-1">
          {confirmEnd ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => send({ action: "end_plan" }, "Moved to the Free plan")}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white bg-red-600 disabled:opacity-50"
              >
                {busy === "end" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Yes, end {currentPlanName} now
              </button>
              <button type="button" onClick={() => setConfirmEnd(false)} className="px-3 py-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmEnd(true)} className="text-xs font-semibold underline underline-offset-2" style={{ color: "var(--text-muted)" }}>
              End plan (back to Free)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
