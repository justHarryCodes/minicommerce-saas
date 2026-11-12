"use client";

// Plan cards with a Monthly / Yearly switch. Used two ways on Billing:
// - "hero": a store that has never subscribed sees it like the pricing page
// - "compact": the plan picker when renewing or switching
import { Check, Minus, Sparkles } from "lucide-react";
import { ALL_FEATURES, FEATURES, featuresForPlan, type Feature } from "@/lib/features-shared";
import { type BillingCycle, priceFor, yearlyPerMonth, yearlySavings } from "@/lib/plan-pricing";

export interface PricingPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  max_products: number;
  max_reels: number;
  features?: string[] | null;
}

function naira(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
}

/** The headline features to show on a card (paid ones the plan unlocks). */
const SHOWCASE: Feature[] = ["custom_domain", "analytics", "customers", "coupons", "ai_tools", "abandoned_carts", "reels", "team", "pos"];

export function CycleToggle({
  cycle,
  onChange,
  discount,
  yearlyAvailable,
  size = "md",
}: {
  cycle: BillingCycle;
  onChange: (c: BillingCycle) => void;
  discount: number;
  yearlyAvailable: boolean;
  size?: "sm" | "md";
}) {
  if (!yearlyAvailable) return null;
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <div role="radiogroup" aria-label="Billing period" className="inline-flex items-center gap-1 rounded-full p-1" style={{ background: "var(--bg-secondary, #f3f4f6)", border: "1px solid var(--border)" }}>
      {(["monthly", "yearly"] as const).map((c) => {
        const on = cycle === c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(c)}
            className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-all ${pad}`}
            style={{
              background: on ? "var(--bg, #fff)" : "transparent",
              color: on ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: on ? "0 1px 3px rgba(0,0,0,.12)" : "none",
            }}
          >
            {c === "monthly" ? "Monthly" : "Yearly"}
            {c === "yearly" && discount > 0 && (
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide" style={{ background: "#16a34a", color: "#fff" }}>
                Save {discount}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function PlanPricing({
  plans,
  freePlan,
  cycle,
  discount,
  currentPlanId,
  selectedPlanId,
  onSelect,
  variant,
}: {
  plans: PricingPlan[];
  freePlan?: PricingPlan | null;
  cycle: BillingCycle;
  discount: number;
  currentPlanId: string | null;
  selectedPlanId: string | null;
  onSelect: (planId: string) => void;
  variant: "hero" | "compact";
}) {
  const hero = variant === "hero";
  const all = hero && freePlan ? [freePlan, ...plans] : plans;
  const popularId = plans.length >= 2 ? plans[Math.floor((plans.length - 1) / 2)]?.id : plans[0]?.id;
  const cols = all.length >= 4 ? "lg:grid-cols-4" : all.length === 3 ? "lg:grid-cols-3" : all.length === 2 ? "sm:grid-cols-2" : "";

  return (
    <div className={`grid items-stretch gap-4 ${hero ? "pt-4" : ""} ${cols} ${hero ? "" : "sm:grid-cols-2"}`}>
      {all.map((plan) => {
        const free = Number(plan.price_monthly) <= 0;
        const popular = hero && plan.id === popularId;
        const selected = plan.id === selectedPlanId;
        const isCurrent = plan.id === currentPlanId;
        const unlocked = new Set(featuresForPlan({ isPro: !free, features: plan.features }));
        const showcase = SHOWCASE.filter((f) => ALL_FEATURES.includes(f));
        const price = free ? 0 : priceFor(plan.price_monthly, cycle, discount);
        const dark = popular;
        const ink = dark ? "#000" : "var(--text-primary)";
        const sub = dark ? "rgba(0,0,0,.62)" : "var(--text-muted)";

        return (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border p-5 transition-all ${hero ? "sm:p-6" : ""} ${popular ? "shadow-xl lg:-translate-y-2" : ""}`}
            style={{
              background: popular ? "var(--accent)" : selected ? "var(--bg-secondary, #f9fafb)" : "var(--bg)",
              borderColor: selected ? "var(--accent)" : popular ? "transparent" : "var(--border)",
              boxShadow: selected && !popular ? "0 0 0 1px var(--accent)" : undefined,
            }}
          >
            {popular && (
              <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-black px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                <Sparkles className="h-3 w-3" /> Most popular
              </span>
            )}
            <div className="flex items-start justify-between gap-2">
              <h3 className={`${hero ? "text-lg" : "text-sm"} font-black`} style={{ color: ink }}>
                {plan.name}
              </h3>
              {isCurrent && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: dark ? "rgba(0,0,0,.12)" : "#16a34a14", color: dark ? "#000" : "#16a34a" }}>
                  Current
                </span>
              )}
            </div>
            {plan.description && (
              <p className={`mt-1 ${hero ? "min-h-[2.5rem] text-sm" : "text-xs"} leading-relaxed`} style={{ color: sub }}>
                {plan.description}
              </p>
            )}

            <div className="mt-4">
              {free ? (
                <p className={`${hero ? "text-4xl" : "text-2xl"} font-black tabular-nums`} style={{ color: ink }}>
                  ₦0 <span className="text-sm font-semibold" style={{ color: sub }}>forever</span>
                </p>
              ) : cycle === "yearly" ? (
                <>
                  <p className={`${hero ? "text-4xl" : "text-2xl"} font-black tabular-nums`} style={{ color: ink }}>
                    {naira(yearlyPerMonth(plan.price_monthly, discount))}
                    <span className="text-sm font-semibold" style={{ color: sub }}> /month</span>
                  </p>
                  <p className="mt-1 text-xs" style={{ color: sub }}>
                    <span className="line-through">{naira(plan.price_monthly)}</span> · {naira(price)} billed yearly
                  </p>
                  {discount > 0 && (
                    <p className="mt-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-bold" style={{ background: dark ? "rgba(0,0,0,.12)" : "#16a34a14", color: dark ? "#000" : "#15803d" }}>
                      You save {naira(yearlySavings(plan.price_monthly, discount))} a year
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className={`${hero ? "text-4xl" : "text-2xl"} font-black tabular-nums`} style={{ color: ink }}>
                    {naira(price)}
                    <span className="text-sm font-semibold" style={{ color: sub }}> /month</span>
                  </p>
                  <p className="mt-1 text-xs" style={{ color: sub }}>
                    Billed monthly · cancel anytime
                  </p>
                </>
              )}
            </div>

            {free ? (
              <div className="mt-5 rounded-xl border px-4 py-2.5 text-center text-sm font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                {isCurrent || !currentPlanId ? "You're on Free" : "Free plan"}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(plan.id)}
                aria-pressed={selected}
                className="mt-5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                style={popular ? { background: "#000", color: "#fff" } : { background: selected ? "var(--text-primary)" : "var(--accent)", color: selected ? "var(--bg)" : "#000" }}
              >
                {selected ? "Selected ✓" : isCurrent ? `Renew ${plan.name}` : `Get ${plan.name}`}
              </button>
            )}

            <ul className={`mt-5 flex-1 space-y-2 ${hero ? "text-sm" : "text-xs"}`}>
              <li className="flex items-start gap-2 font-semibold" style={{ color: ink }}>
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: dark ? "#000" : "#16a34a" }} />
                Up to {Number(plan.max_products).toLocaleString()} products
              </li>
              <li className="flex items-start gap-2 font-semibold" style={{ color: plan.max_reels > 0 ? ink : sub }}>
                {plan.max_reels > 0 ? <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: dark ? "#000" : "#16a34a" }} /> : <Minus className="mt-0.5 h-4 w-4 shrink-0" />}
                {plan.max_reels > 0 ? `${plan.max_reels} reels a month` : "No video reels"}
              </li>
              {(hero ? showcase : showcase.slice(0, 5)).map((f) => {
                const has = unlocked.has(f);
                return (
                  <li key={f} className="flex items-start gap-2" style={{ color: has ? (dark ? "rgba(0,0,0,.82)" : "var(--text-secondary)") : sub, opacity: has ? 1 : 0.55 }}>
                    {has ? <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: dark ? "#000" : "#16a34a" }} /> : <Minus className="mt-0.5 h-4 w-4 shrink-0" />}
                    <span className={has ? "" : "line-through decoration-1"}>{FEATURES[f].label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
