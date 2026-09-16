import Link from "next/link";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { query } from "@/lib/db";
import HomeNav from "../HomeNav";
import Image from "next/image";

export const metadata = {
  title: "Pricing · Duka by Awarizon",
  description: "Simple, transparent pricing for Nigerian vendors — start free, upgrade when you grow.",
};

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  max_products: number;
  max_reels: number;
}

function fmtNaira(n: number) {
  return n === 0 ? "Free" : `₦${n.toLocaleString("en-NG")}`;
}

export default async function PricingPage() {
  const plans = await query<Plan>(
    `SELECT id, name, description, price_monthly, max_products, max_reels
     FROM plans WHERE is_active = true ORDER BY sort_order ASC`,
    []
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <HomeNav />

      {/* ── Header ───────────────────────────────────────── */}
      <section className="pt-20 pb-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
            Pricing
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-5" style={{ color: "var(--text-primary)" }}>
            Simple, honest pricing
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Start selling for free. Upgrade only when your store outgrows the free tier —
            no setup fees, no hidden charges, cancel anytime.
          </p>
        </div>
      </section>

      {/* ── Plan cards ───────────────────────────────────── */}
      <section className="px-4 pb-24">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => {
            const isFree = plan.price_monthly === 0;
            const isMiddle = !isFree && plans.indexOf(plan) === 1;
            return (
              <div
                key={plan.id}
                className="relative rounded-3xl p-8 flex flex-col h-full"
                style={
                  isMiddle
                    ? { background: "var(--accent)", border: "1px solid transparent" }
                    : { background: "var(--bg-secondary)", border: "1px solid var(--border)" }
                }
              >
                {isMiddle && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide bg-black text-white">
                    <Sparkles className="w-3 h-3" /> Most popular
                  </span>
                )}

                <h2
                  className="text-xl font-black mb-1"
                  style={{ color: isMiddle ? "#000" : "var(--text-primary)" }}
                >
                  {plan.name}
                </h2>
                <p
                  className="text-sm mb-6 leading-relaxed"
                  style={{ color: isMiddle ? "rgba(0,0,0,0.6)" : "var(--text-secondary)" }}
                >
                  {plan.description}
                </p>

                <div className="mb-6">
                  <span
                    className="text-4xl font-black"
                    style={{ color: isMiddle ? "#000" : "var(--text-primary)" }}
                  >
                    {fmtNaira(plan.price_monthly)}
                  </span>
                  {!isFree && (
                    <span
                      className="text-sm font-medium ml-1"
                      style={{ color: isMiddle ? "rgba(0,0,0,0.6)" : "var(--text-muted)" }}
                    >
                      /month
                    </span>
                  )}
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {[
                    `Up to ${plan.max_products.toLocaleString("en-NG")} product${plan.max_products === 1 ? "" : "s"}`,
                    plan.max_reels > 0
                      ? `${plan.max_reels} short-video reels / month`
                      : "No video reels",
                    "Your own store link on dukanigeria.com",
                    "Paystack & bank transfer checkout",
                    "Order & inventory dashboard",
                    "AI-assisted store setup",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span
                        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                        style={{ background: isMiddle ? "rgba(0,0,0,0.12)" : "var(--accent-light)" }}
                      >
                        <Check className="w-3 h-3" style={{ color: isMiddle ? "#000" : "var(--accent-dark)" }} />
                      </span>
                      <span
                        className="text-sm leading-relaxed"
                        style={{ color: isMiddle ? "rgba(0,0,0,0.8)" : "var(--text-secondary)" }}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 hover:scale-[1.02]"
                  style={
                    isMiddle
                      ? { background: "#000", color: "#fff" }
                      : { background: "var(--accent)", color: "#000" }
                  }
                >
                  {isFree ? "Start free" : "Get started"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {plans.length === 0 && (
          <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Pricing is being updated — check back shortly, or{" "}
            <Link href="/auth/signup" className="underline font-semibold" style={{ color: "var(--accent)" }}>
              sign up free
            </Link>{" "}
            to get started now.
          </p>
        )}
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="px-4 pb-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-10" style={{ color: "var(--text-primary)" }}>
            Questions, answered
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Is there really no setup fee?",
                a: "Correct — you can create a store and start listing products for free, with no upfront cost. You only pay if you choose to upgrade for more products or reels.",
              },
              {
                q: "Can I switch plans later?",
                a: "Yes. Upgrade or downgrade any time from your dashboard's Billing page — changes apply to your next billing cycle.",
              },
              {
                q: "How do I get paid?",
                a: "Customers pay you directly via Paystack (cards, bank transfer, USSD) or manual bank transfer confirmed in your dashboard. Duka never holds your money.",
              },
              {
                q: "What happens if I go over my product limit?",
                a: "You'll see a clear prompt in your dashboard to upgrade before you can add more — nothing you've already listed gets removed or hidden.",
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="rounded-2xl border p-6"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
              >
                <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                  {q}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="py-10 px-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex flex-col items-start gap-0.5">
            <Image src="/logo.png" alt="Duka" width={112} height={28} className="h-7 w-auto object-contain" />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>by Awarizon</span>
          </Link>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Duka by Awarizon. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
