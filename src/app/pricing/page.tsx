import Link from "next/link";
import Image from "next/image";
import {
  Check,
  ArrowRight,
  Sparkles,
  Store,
  Wallet,
  LayoutDashboard,
  ShieldCheck,
  MessageCircle,
  Smartphone,
  Plus,
  Minus,
} from "lucide-react";
import { query } from "@/lib/db";
import { getOrSet, cacheKey } from "@/lib/redis";
import HomeNav from "../HomeNav";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Pricing · Duka by Awarizon",
  description:
    "Simple, transparent pricing for Nigerian vendors — start free, upgrade when you grow.",
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
  return n === 0 ? "₦0" : `₦${n.toLocaleString("en-NG")}`;
}

function productsLabel(n: number) {
  return `${n.toLocaleString("en-NG")} product${n === 1 ? "" : "s"}`;
}

const INCLUDED = [
  {
    icon: Store,
    title: "Your own store link",
    text: "A branded storefront on dukanigeria.com you can share anywhere.",
  },
  {
    icon: Wallet,
    title: "Paystack and bank transfer",
    text: "Cards, bank transfer and USSD. Duka never holds your money.",
  },
  {
    icon: LayoutDashboard,
    title: "Orders and inventory dashboard",
    text: "Track every order and your stock in one place.",
  },
  {
    icon: Sparkles,
    title: "AI-assisted setup",
    text: "Describe what you sell and your categories are built for you.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp contact",
    text: "Shoppers can reach you directly with one tap.",
  },
  {
    icon: Smartphone,
    title: "Mobile-friendly shopping",
    text: "Fast, clean and easy to browse on any phone.",
  },
  {
    icon: ShieldCheck,
    title: "Marketplace listing",
    text: "Your store appears in the Duka vendor directory.",
  },
];

const FAQ = [
  {
    q: "Is there really no setup fee?",
    a: "Correct. You can create a store and start listing products for free, with no upfront cost. You only pay if you choose to upgrade for more products or reels.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. Upgrade or downgrade any time from your dashboard's Billing page. Changes apply to your next billing cycle.",
  },
  {
    q: "How do I get paid?",
    a: "Customers pay you directly via Paystack (cards, bank transfer, USSD) or manual bank transfer confirmed in your dashboard. Duka never holds your money.",
  },
  {
    q: "What happens if I go over my product limit?",
    a: "You'll see a clear prompt in your dashboard to upgrade before you can add more. Nothing you've already listed gets removed or hidden.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There are no contracts. You can cancel whenever you like.",
  },
];

// Rendered per request (from a 5-minute cache) — it used to be built once
// at deploy time, so plan changes in the admin never showed until the next
// deploy, and a slow database could fail the whole build.
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const plans =
    (await getOrSet<Plan[]>(
      cacheKey.publicPlans(),
      () =>
        query<Plan>(
          `SELECT id, name, description, price_monthly, max_products, max_reels
           FROM plans WHERE is_active = true ORDER BY sort_order ASC`,
          [],
        ),
      300,
    )) ?? [];

  const popularIndex = plans.length > 2 ? 1 : -1;

  const gridCols =
    plans.length >= 4
      ? "lg:grid-cols-4 max-w-7xl"
      : plans.length === 3
        ? "lg:grid-cols-3 max-w-6xl"
        : plans.length === 2
          ? "sm:grid-cols-2 max-w-3xl"
          : "max-w-md";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <HomeNav />

      {/* ═════════════ HEADER ═════════════ */}
      <section className="relative overflow-hidden px-4 pb-14 pt-16 text-center sm:pt-24">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-[-140px] h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-[0.16] blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse, #f59e0b 0%, transparent 70%)",
            }}
          />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-black"
            style={{ background: "var(--accent-light)" }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Start free, upgrade when you grow
          </div>
          <h1
            className="mb-5 text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl"
            style={{ color: "var(--text-primary)" }}
          >
            One store.{" "}
            <span style={{ color: "var(--accent)" }}>Honest pricing.</span>
          </h1>
          <p
            className="mx-auto max-w-xl text-lg leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Launch your online store for free. Pay only when you need more
            products or reels. No setup fees, no hidden charges, cancel anytime.
          </p>

          <ul
            className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {["No setup fees", "No card to start", "Cancel anytime"].map(
              (t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check
                    className="h-4 w-4"
                    style={{ color: "var(--accent)" }}
                  />
                  {t}
                </li>
              ),
            )}
          </ul>
        </div>
      </section>

      {/* ═════════════ PLAN CARDS ═════════════ */}
      <section className="px-4 pb-20">
        <div className={`mx-auto grid items-stretch gap-6 pt-4 ${gridCols}`}>
          {plans.map((plan, idx) => {
            const isFree = plan.price_monthly === 0;
            const popular = idx === popularIndex;

            const features = [
              {
                text: `Up to ${productsLabel(plan.max_products)}`,
                strong: true,
              },
              {
                text:
                  plan.max_reels > 0
                    ? `${plan.max_reels} short-video reels / month`
                    : "No video reels",
                strong: true,
                muted: plan.max_reels === 0,
              },
              { text: "Your own store link on dukanigeria.com" },
              { text: "Paystack and bank transfer checkout" },
              { text: "Order and inventory dashboard" },
              { text: "AI-assisted store setup" },
            ];

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl p-7 transition-all sm:p-8 ${
                  popular
                    ? "shadow-2xl lg:-translate-y-4"
                    : "hover:-translate-y-1 hover:shadow-lg"
                }`}
                style={
                  popular
                    ? {
                        background: "var(--accent)",
                        border: "1px solid transparent",
                      }
                    : {
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                      }
                }
              >
                {popular && (
                  <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-black px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wide text-white">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </span>
                )}

                <h2
                  className="mb-1 text-xl font-black"
                  style={{ color: popular ? "#000" : "var(--text-primary)" }}
                >
                  {plan.name}
                </h2>
                <p
                  className="mb-6 min-h-[2.5rem] text-sm leading-relaxed"
                  style={{
                    color: popular
                      ? "rgba(0,0,0,0.65)"
                      : "var(--text-secondary)",
                  }}
                >
                  {plan.description}
                </p>

                <div className="mb-1 flex items-baseline gap-1">
                  <span
                    className="text-5xl font-black tracking-tight"
                    style={{ color: popular ? "#000" : "var(--text-primary)" }}
                  >
                    {fmtNaira(plan.price_monthly)}
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: popular ? "rgba(0,0,0,0.6)" : "var(--text-muted)",
                    }}
                  >
                    {isFree ? "forever" : "/ month"}
                  </span>
                </div>
                <p
                  className="mb-7 text-xs"
                  style={{
                    color: popular ? "rgba(0,0,0,0.55)" : "var(--text-muted)",
                  }}
                >
                  {isFree ? "No card required" : "Cancel anytime"}
                </p>

                <Link
                  href="/auth/signup"
                  className="mb-7 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition-all hover:scale-[1.02] hover:opacity-90"
                  style={
                    popular
                      ? { background: "#000", color: "#fff" }
                      : isFree
                        ? {
                            background: "transparent",
                            color: "var(--text-primary)",
                            border: "2px solid var(--border-strong)",
                          }
                        : { background: "var(--accent)", color: "#000" }
                  }
                >
                  {isFree ? "Start for free" : `Get ${plan.name}`}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <div
                  className="mb-4 h-px w-full"
                  style={{
                    background: popular ? "rgba(0,0,0,0.12)" : "var(--border)",
                  }}
                />

                <ul className="flex-1 space-y-3">
                  {features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: popular
                            ? "rgba(0,0,0,0.12)"
                            : "var(--accent-light)",
                        }}
                      >
                        <Check
                          className="h-3 w-3"
                          style={{
                            color: popular ? "#000" : "var(--accent-dark)",
                          }}
                        />
                      </span>
                      <span
                        className={`text-sm leading-relaxed ${f.strong ? "font-bold" : ""}`}
                        style={{
                          color: popular
                            ? f.muted
                              ? "rgba(0,0,0,0.55)"
                              : "rgba(0,0,0,0.85)"
                            : f.muted
                              ? "var(--text-muted)"
                              : f.strong
                                ? "var(--text-primary)"
                                : "var(--text-secondary)",
                        }}
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {plans.length === 0 && (
          <p
            className="text-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Pricing is being updated. Check back shortly, or{" "}
            <Link
              href="/auth/signup"
              className="font-semibold underline"
              style={{ color: "var(--accent)" }}
            >
              sign up free
            </Link>{" "}
            to get started now.
          </p>
        )}
      </section>

      {/* ═════════════ COMPARE PLANS ═════════════ */}
      {plans.length > 1 && (
        <section
          className="px-4 py-20"
          style={{ background: "var(--bg-secondary)" }}
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <p
                className="mb-3 text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--accent)" }}
              >
                Compare plans
              </p>
              <h2
                className="text-3xl font-black tracking-tight sm:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                See what changes as you grow
              </h2>
            </div>

            <div
              className="overflow-x-auto rounded-3xl border"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr style={{ background: "var(--bg-tertiary)" }}>
                    <th
                      className="p-4 text-left font-semibold"
                      style={{ color: "var(--text-muted)" }}
                    />
                    {plans.map((p, idx) => (
                      <th
                        key={p.id}
                        className="p-4 text-center font-black"
                        style={
                          idx === popularIndex
                            ? { background: "var(--accent)", color: "#000" }
                            : { color: "var(--text-primary)" }
                        }
                      >
                        {p.name}
                        <div className="text-xs font-semibold opacity-70">
                          {p.price_monthly === 0
                            ? "Free"
                            : `${fmtNaira(p.price_monthly)}/mo`}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className="border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td
                      className="p-4 font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Products
                    </td>
                    {plans.map((p) => (
                      <td
                        key={p.id}
                        className="p-4 text-center font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {p.max_products.toLocaleString("en-NG")}
                      </td>
                    ))}
                  </tr>
                  <tr
                    className="border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td
                      className="p-4 font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Video reels / month
                    </td>
                    {plans.map((p) => (
                      <td
                        key={p.id}
                        className="p-4 text-center font-bold"
                        style={{
                          color:
                            p.max_reels > 0
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                        }}
                      >
                        {p.max_reels > 0 ? p.max_reels : "—"}
                      </td>
                    ))}
                  </tr>
                  {[
                    "Store link on dukanigeria.com",
                    "Paystack and bank transfer checkout",
                    "Order and inventory dashboard",
                    "AI-assisted store setup",
                    "Marketplace listing",
                  ].map((row) => (
                    <tr
                      key={row}
                      className="border-t"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td
                        className="p-4 font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {row}
                      </td>
                      {plans.map((p) => (
                        <td key={p.id} className="p-4 text-center">
                          <Check className="mx-auto h-5 w-5 text-green-600" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ═════════════ INCLUDED IN EVERY PLAN ═════════════ */}
      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--accent)" }}
            >
              In every plan
            </p>
            <h2
              className="mb-3 text-3xl font-black tracking-tight sm:text-4xl"
              style={{ color: "var(--text-primary)" }}
            >
              Every store gets the essentials
            </h2>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
              Plans only change your limits. The tools you need to sell are
              always included.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border p-5"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "var(--accent)" }}
                >
                  <Icon className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3
                    className="mb-1 text-sm font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ FAQ ═════════════ */}
      <section className="px-4 pb-20" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-3xl">
          <h2
            className="mb-10 text-center text-3xl font-black tracking-tight sm:text-4xl"
            style={{ color: "var(--text-primary)" }}
          >
            Questions, answered
          </h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border px-6 py-5 open:shadow-md"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold [&::-webkit-details-marker]:hidden"
                  style={{ color: "var(--text-primary)" }}
                >
                  {q}
                  <span className="shrink-0" style={{ color: "var(--accent)" }}>
                    <Plus className="h-5 w-5 group-open:hidden" />
                    <Minus className="hidden h-5 w-5 group-open:block" />
                  </span>
                </summary>
                <p
                  className="mt-3 text-sm leading-relaxed sm:text-base"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ FINAL CTA ═════════════ */}
      <section className="px-4 pb-20">
        <div
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-8 py-14 text-center sm:px-16 sm:py-20"
          style={{ background: "var(--accent)" }}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white opacity-10" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-black opacity-5" />
          </div>
          <div className="relative">
            <h2 className="mb-4 text-3xl font-black text-black sm:text-5xl">
              Your store is 10 minutes away
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-lg text-black/70">
              Start on the free plan today. Upgrade only when your business
              needs more room.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-8 py-4 text-lg font-bold text-white transition-all hover:scale-[1.02] hover:opacity-85"
              >
                Create free store <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-black/20 px-8 py-4 text-lg font-semibold text-black transition-all hover:border-black/40 hover:bg-black/5"
              >
                See live stores
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Sticky mobile CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t p-3 backdrop-blur-md lg:hidden"
        style={{
          background: "color-mix(in srgb, var(--bg) 92%, transparent)",
          borderColor: "var(--border)",
        }}
      >
        <Link
          href="/auth/signup"
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-black"
          style={{ background: "var(--accent)" }}
        >
          Start free <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
