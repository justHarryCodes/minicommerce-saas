import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { verifyAdminSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { getOrSet } from "@/lib/redis";
import { getStoreAccess } from "@/lib/access";
import ProductSlider, { type ProductSlide } from "./ProductSlider";
import HomeNav from "./HomeNav";
import VideoHero from "./VideoHero";
import Footer from "@/components/Footer";
import GrantHomeSection from "@/components/grant/GrantHomeSection";
import { currentRound } from "@/lib/grants";
import GooglePlayBadge from "@/components/GooglePlayBadge";
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  LayoutDashboard,
  MessageCircle,
  Search,
  Share2,
  Smartphone,
  Store,
  TrendingUp,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import CommerceScene from "./landing/CommerceScene";
import AutomationPanel from "./landing/AutomationPanel";
import CountUp from "./landing/CountUp";
import Faq from "./landing/Faq";
import Icon3D, { type Tone } from "./landing/Icon3D";
import { PHOTO } from "./landing/media";
import { Reveal } from "./landing/Reveal";
import WhatsAppScreen from "./landing/screens/WhatsAppScreen";
import {
  CheckoutScreen,
  DashboardScreen,
  SearchScreen,
  ShareScreen,
  StorefrontScreen,
} from "./landing/screens/Screens";
import type { Metadata } from "next";
import { jsonLd, platformLd } from "@/lib/seo";
import SocialIcon, { type SocialName } from "@/components/SocialIcon";

export const metadata: Metadata = {
  title: {
    absolute:
      "Duka - Create your online store in Nigeria | Sell on WhatsApp & Instagram",
  },
  description:
    "Start your online store free in minutes. Get your own website, take payments by card, transfer and USSD, manage orders and deliveries, and sell on WhatsApp, Instagram and Google.",
  alternates: { canonical: "/" },
  keywords: [
    "online store Nigeria",
    "ecommerce website Nigeria",
    "sell on WhatsApp",
    "sell on Instagram",
    "Shopify alternative Nigeria",
    "create online shop",
    "Duka",
  ],
};

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "Fashion and Clothing": { icon: "👗", color: "#ec4899" },
  "Shoes and Sneakers": { icon: "👟", color: "#f97316" },
  "Bags and Accessories": { icon: "👜", color: "#a855f7" },
  "Beauty and Makeup": { icon: "💄", color: "#f43f5e" },
  "Hair and Wigs": { icon: "💇", color: "#06b6d4" },
  "Food and Catering": { icon: "🍽️", color: "#22c55e" },
  "Electronics and Gadgets": { icon: "⚡", color: "#3b82f6" },
  "Phones and Accessories": { icon: "📱", color: "#6366f1" },
  "Laptops and Computing": { icon: "💻", color: "#0ea5e9" },
  "Furniture and Home": { icon: "🛋️", color: "#84cc16" },
  "Artwork and Paintings": { icon: "🎨", color: "#f59e0b" },
  "Jewelry and Watches": { icon: "💎", color: "#14b8a6" },
  "Books and Stationery": { icon: "📚", color: "#8b5cf6" },
  Other: { icon: "📦", color: "#71717a" },
};

export default async function HomePage() {
  // ── Subdomain guard ──────────────────────────────────────────────────────
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();

  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "dukanigeria.com")
    .toLowerCase()
    .replace(/^www\./, "");

  const isSubdomain =
    host.endsWith(`.${rootDomain}`) &&
    !host.startsWith("www.") &&
    !host.startsWith("localhost");

  if (isSubdomain) {
    const slug = host.slice(0, -(rootDomain.length + 1));
    redirect(`/store/${slug}`);
  }

  // ── Auth redirects (main domain only) ───────────────────────────────────
  const user = await verifySession();
  if (user) {
    const admin = await verifyAdminSession();
    if (admin) redirect("/admin");
    // Owners and team members go to their dashboard
    const access = await getStoreAccess(user);
    redirect(
      access
        ? access.role === "staff"
          ? "/dashboard/orders"
          : "/dashboard"
        : "/onboarding",
    );
  }

  // Platform-wide figures: the same for every visitor, so cached briefly
  // (the product query sorts the whole catalogue at random).
  const [categoryStats, products, grantRound] = await Promise.all([
    getOrSet(
      "home:categoryStats",
      () =>
        query<{ primary_category: string; count: string }>(
          `SELECT primary_category, COUNT(*) as count
       FROM stores
       WHERE is_active = true AND deleted_at IS NULL AND primary_category IS NOT NULL
         AND EXISTS (SELECT 1 FROM products p WHERE p.store_id = stores.id AND p.is_active = true)
       GROUP BY primary_category
       ORDER BY count DESC`,
          [],
        ),
      600,
    ).then((r) => r ?? []),
    getOrSet(
      "home:productSlides",
      () =>
        query<ProductSlide>(
          `SELECT p.id, p.name, p.slug, p.price::float AS price,
              p.compare_price::float AS compare_price, p.image_url,
              s.name AS store_name, s.slug AS store_slug
       FROM products p
       JOIN stores s ON s.id = p.store_id
       WHERE p.is_active = true
         AND (p.stock_quantity IS NULL OR p.stock_quantity > 0)
         AND s.is_active = true
         AND p.image_url IS NOT NULL AND p.image_url <> ''
       ORDER BY RANDOM()
       LIMIT 12`,
          [],
        ),
      300,
    ).then((r) => r ?? []),
    // The Vendor Grant round (amount, open/closed, countdown); never blocks the page
    currentRound().catch(() => null),
  ]);

  // One chip per category even if stores typed it differently ("Other" / "other")
  const mergedCategories = Object.values(
    categoryStats.reduce<
      Record<string, { primary_category: string; count: number }>
    >((acc, c) => {
      const k = c.primary_category.trim().toLowerCase();
      const name = CATEGORY_META[c.primary_category]
        ? c.primary_category
        : (acc[k]?.primary_category ?? c.primary_category.trim());
      acc[k] = {
        primary_category: name,
        count: (acc[k]?.count ?? 0) + parseInt(c.count),
      };
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  const totalStores = categoryStats.reduce(
    (sum, c) => sum + parseInt(c.count),
    0,
  );

  const faq = [
    {
      q: "Is Duka really free to start?",
      a: "Yes. Create your store and start taking orders on the Free plan. Upgrade only when you need more.",
    },
    {
      q: "How do my customers pay?",
      a: "Card, bank transfer, USSD or pay on delivery. Money lands in your bank account.",
    },
    {
      q: "Can I sell on WhatsApp and Instagram?",
      a: "Yes. Share product links that show a picture card with the price, or connect the WhatsApp shop so customers buy inside the chat.",
    },
    {
      q: "Do I need a website or tech skills?",
      a: "No. Your store is live on its own link in minutes, and you can connect your own .com later.",
    },
  ];

  const stages = [
    {
      plan: "Free",
      tone: "green" as const,
      icon: Smartphone,
      title: "Start from your phone",
      lead: "First sale before lunch.",
      rest: "Your store, live today, for ₦0.",
      img: PHOTO.founder,
    },
    {
      plan: "Grow",
      tone: "amber" as const,
      icon: TrendingUp,
      title: "Grow into a brand",
      lead: "Bring buyers back.",
      rest: "Discount codes, cart reminders and analytics.",
      img: PHOTO.boutique,
    },
    {
      plan: "Pro",
      tone: "violet" as const,
      icon: Building2,
      title: "Run it like a company",
      lead: "Your own .com.",
      rest: "Staff accounts for your packers, cashiers and managers.",
      img: PHOTO.team,
    },
  ];

  const tools = [
    {
      id: "tool-store",
      eyebrow: "Your store",
      icon: Store,
      tone: "pink" as const,
      title: "A real store, live in minutes.",
      caption: "One link replaces every “send me pictures”.",
      points: ["yourbrand.dukanigeria.com", "Made for phones", "AI sets up your categories"],
      screen: <StorefrontScreen className="w-[250px] sm:w-[270px]" />,
      glow: "rgba(244,63,94,0.35)",
    },
    {
      id: "tool-pay",
      eyebrow: "Get paid",
      icon: Wallet,
      tone: "green" as const,
      title: "Checkout that collects the money.",
      caption: "No more “send proof of payment”.",
      points: ["Card, transfer, USSD", "Pay on delivery", "Paystack-secured"],
      screen: <CheckoutScreen className="w-[250px] sm:w-[270px]" />,
      glow: "rgba(16,185,129,0.35)",
    },
    {
      id: "tool-run",
      eyebrow: "Run it",
      icon: LayoutDashboard,
      tone: "amber" as const,
      title: "Your whole business, one screen.",
      caption: "Orders, money and stock. Not in a notebook.",
      points: ["Live orders & revenue", "Stock that updates itself", "Team accounts"],
      screen: <DashboardScreen className="w-full max-w-[600px]" />,
      glow: "rgba(245,158,11,0.35)",
    },
    {
      id: "tool-found",
      eyebrow: "Get found",
      icon: Search,
      tone: "blue" as const,
      title: "Found on Google. Discovered on Duka.",
      caption: "Customers who don’t follow you yet.",
      points: ["Products show on Google", "Listed on Duka Discover", "Verified badge"],
      screen: <SearchScreen className="w-full max-w-[560px]" />,
      glow: "rgba(59,130,246,0.35)",
    },
  ];

  const steps = [
    { n: "01", title: "Add your first product", img: PHOTO.maker },
    { n: "02", title: "Make the store yours", img: PHOTO.rack },
    { n: "03", title: "Share the link. Get paid.", img: PHOTO.founder },
  ];

  const H2 = "text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl";

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--bg)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(platformLd()) }} />
      <HomeNav overlay />

      {/* ═════════════ VIDEO HEADER ═════════════ */}
      <VideoHero storeCount={totalStores} />

      {/* ═════════════ STOP SELLING IN DMs ═════════════ */}
      <section id="how-duka-works" className="scroll-mt-16 px-4 pb-24 pt-24 sm:pb-32 sm:pt-32">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <h2 className={`max-w-6xl ${H2}`}>
              <span style={{ color: "var(--text-muted)" }}>Stop selling in DMs. </span>
              <span style={{ color: "var(--text-primary)" }}>Start running a real store. </span>
              <span style={{ color: "var(--text-muted)" }}>On WhatsApp, Instagram, TikTok and Google.</span>
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-4 lg:grid-cols-[1.2fr_0.9fr_1.2fr]">
            <Reveal className="relative flex min-h-[600px] flex-col items-center justify-end overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#0b3d2e] to-[#04130f] px-6 pt-28">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(37,211,102,0.35),transparent_60%)]" />
              <WhatsAppScreen className="relative w-[270px] translate-y-8" />
              <PanelLabel icon={MessageCircle} social="whatsapp" tone="green" title="Shop inside WhatsApp" />
            </Reveal>
            <Reveal delay={0.08} className="relative flex min-h-[600px] flex-col items-center justify-end overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#ffe4e6] to-[#fed7aa] px-6 pt-28 dark:from-[#3b0d17] dark:to-[#2a1405]">
              <StorefrontScreen className="relative w-[250px] translate-y-8" />
              <PanelLabel icon={Store} tone="pink" title="Your own store link" ink="dark" />
            </Reveal>
            <Reveal delay={0.16} className="relative flex min-h-[600px] flex-col items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-b from-zinc-800 to-zinc-950 px-8 pb-16 pt-28">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,0.3),transparent_60%)]" />
              <ShareScreen className="relative w-full max-w-[340px]" />
              <PanelLabel icon={Share2} tone="amber" title="Links that sell for you" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═════════════ ENTREPRENEUR TO ENTERPRISE ═════════════ */}
      <section className="bg-[#05090a] px-4 py-24 text-white sm:py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <h2 className={H2}>
              From entrepreneur
              <br />
              <span className="text-white/45">to enterprise.</span>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {stages.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <div className="group">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-zinc-900">
                    <Image src={s.img} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs font-bold backdrop-blur-md">{s.plan}</span>
                    <span className="absolute bottom-4 left-4">
                      <Icon3D icon={s.icon} tone={s.tone} size={52} />
                    </span>
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-1.5 text-white/55">
                    <b className="font-semibold text-white">{s.lead}</b> {s.rest}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ DUKA TOOLS ═════════════ */}
      <section id="tools" className="scroll-mt-20 px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-16 sm:mb-24">
            <h2 className={H2}>
              <span style={{ color: "var(--text-primary)" }}>Every tool your store needs.</span>
              <br />
              <span style={{ color: "var(--text-muted)" }}>Without the tech stress.</span>
            </h2>
          </Reveal>

          <div className="space-y-20 sm:space-y-32">
            {tools.map((t, i) => {
              const flip = i % 2 === 1;
              return (
                <div key={t.title} id={t.id} className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-2 lg:gap-16">
                  <Reveal className={flip ? "lg:order-2" : ""}>
                    <Icon3D icon={t.icon} tone={t.tone} size={60} />
                    <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-amber-500">{t.eyebrow}</p>
                    <h3 className="mt-2 text-3xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl" style={{ color: "var(--text-primary)" }}>
                      {t.title}
                    </h3>
                    <p className="mt-3 text-lg" style={{ color: "var(--text-muted)" }}>{t.caption}</p>
                    <ul className="mt-7 space-y-3">
                      {t.points.map((p) => (
                        <li key={p} className="flex items-center gap-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                          <Icon3D icon={Check} tone="green" size={24} /> {p}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                  <Reveal delay={0.1} className={flip ? "lg:order-1" : ""}>
                    <div className="relative flex min-h-[460px] items-center justify-center overflow-hidden rounded-[2rem] border px-5 py-12 sm:min-h-[620px]" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                      {/* Glow + rings */}
                      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, ${t.glow}, transparent 62%)` }} />
                      {[260, 400, 540, 680].map((d) => (
                        <span key={d} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border" style={{ width: d, height: d, borderColor: "var(--border)" }} />
                      ))}
                      <div className="relative w-full flex justify-center">{t.screen}</div>
                    </div>
                  </Reveal>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═════════════ SALES ON AUTOPILOT (3D) ═════════════ */}
      <section id="automation" className="relative scroll-mt-16 overflow-hidden bg-[#05090a] px-4 py-24 text-white sm:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(245,158,11,0.22),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
          <div className="min-w-0">
            <Reveal>
              <h2 className={H2}>
                Sales on autopilot.
                <br />
                <span className="text-white/45">Duka does the busywork.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="mt-10">
              <AutomationPanel />
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <CommerceScene className="aspect-square w-full max-w-[640px] justify-self-center lg:ml-auto" />
          </Reveal>
        </div>
      </section>

      {/* ═════════════ NUMBERS ═════════════ */}
      <section className="px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <h2 className={H2} style={{ color: "var(--text-primary)" }}>
              Built for how
              <br />
              Nigeria buys.
            </h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
            {[
              { icon: Wallet, tone: "green" as const, label: "To start", node: <CountUp to={0} prefix="₦" /> },
              { icon: Zap, tone: "amber" as const, label: "To go live", node: <CountUp to={10} suffix="min" /> },
              { icon: Clock, tone: "blue" as const, label: "Your store is open", node: <CountUp to={24} suffix="/7" /> },
              { icon: Store, tone: "pink" as const, label: "Stores powered by Duka", node: <CountUp to={Math.max(totalStores, 1)} suffix="+" /> },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08} className="border-t pt-6" >
                <p className="flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.15em]" style={{ color: "var(--text-muted)" }}>
                  <Icon3D icon={s.icon} tone={s.tone} size={26} /> {s.label}
                </p>
                <p className="mt-4 text-6xl font-semibold tracking-[-0.05em] sm:text-7xl lg:text-8xl" style={{ color: "var(--text-primary)" }}>
                  {s.node}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ LIVE: STORES POWERED BY DUKA ═════════════ */}
      <section className="px-4 py-24 sm:py-28" style={{ background: "var(--bg-secondary)" }}>
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 className={H2} style={{ color: "var(--text-primary)" }}>
              Stores powered
              <br />
              <span style={{ color: "var(--text-muted)" }}>by Duka.</span>
            </h2>
            <Link href="/discover" className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-colors hover:border-amber-400" style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)" }}>
              Explore stores <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          {mergedCategories.length > 0 && (
            <Reveal className="mb-8 flex flex-wrap gap-2">
              {mergedCategories.slice(0, 10).map(({ primary_category, count }) => {
                const meta = CATEGORY_META[primary_category] ?? CATEGORY_META["Other"];
                return (
                  <Link
                    key={primary_category}
                    href={`/discover?category=${encodeURIComponent(primary_category)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                    style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-secondary)" }}
                  >
                    {meta.icon} {primary_category} <span className="text-xs opacity-60">{count}</span>
                  </Link>
                );
              })}
            </Reveal>
          )}
          {products.length > 0 && <ProductSlider products={products} />}
        </div>
      </section>

      {/* ═════════════ LIVE IN 3 STEPS ═════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-900 to-[#05090a] px-4 py-24 text-white sm:py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <h2 className={`text-center ${H2}`}>Live in 3 steps.</h2>
          </Reveal>
          <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
            <Reveal className="grid grid-cols-2 gap-4">
              <div className="relative aspect-[3/4] overflow-hidden rounded-3xl">
                <Image src={steps[0].img} alt="A Nigerian entrepreneur smiling" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
              </div>
              <div className="relative mt-16 aspect-[3/4] overflow-hidden rounded-3xl">
                <Image src={steps[1].img} alt="Clothes on a rail, ready to sell" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
              </div>
            </Reveal>
            <div>
              {steps.map((s, i) => (
                <Reveal key={s.n} delay={i * 0.1}>
                  <div className="group flex items-baseline gap-6 border-b border-white/15 py-6">
                    <span className="font-mono text-xl font-bold text-amber-400">{s.n}</span>
                    <span className="text-3xl font-semibold tracking-[-0.03em] transition-transform duration-300 group-hover:translate-x-1 sm:text-5xl">{s.title}</span>
                  </div>
                </Reveal>
              ))}
              <Reveal delay={0.3}>
                <Link href="/auth/signup" className="group mt-10 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-black transition-transform hover:scale-[1.03]">
                  Start for free <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ VENDOR APP ═════════════ */}
      <section className="px-4 pt-24">
        <Reveal className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 rounded-3xl border p-8 sm:flex-row sm:p-10">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <Icon3D icon={Smartphone} tone="amber" size={60} />
            <div>
              <h2 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Your store in your pocket.</h2>
              <p className="mt-1" style={{ color: "var(--text-muted)" }}>New-order alerts, products and payouts on the go.</p>
            </div>
          </div>
          <GooglePlayBadge />
        </Reveal>
      </section>

      {/* ═════════════ VENDOR GRANT ═════════════ */}
      <GrantHomeSection round={grantRound} />

      {/* ═════════════ FAQ ═════════════ */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-8 text-center">
            <h2 className="text-4xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Questions?</h2>
          </Reveal>
          <Reveal>
            <Faq items={faq} />
          </Reveal>
        </div>
      </section>

      {/* ═════════════ FINAL CTA ═════════════ */}
      <section className="relative overflow-hidden bg-[#05090a] px-4 py-28 text-center text-white sm:py-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(245,158,11,0.45),transparent_60%)]" />
        <Reveal className="relative mx-auto max-w-4xl">
          <h2 className={H2}>
            Your brand. Your store.
            <br />
            <span className="text-amber-400">Powered by Duka.</span>
          </h2>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/auth/signup" className="group inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-8 py-4 text-base font-bold text-black shadow-lg shadow-amber-500/30 transition-transform hover:scale-[1.03]">
              Start for free <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center justify-center rounded-full border border-white/25 px-8 py-4 text-base font-semibold hover:bg-white/10">
              See pricing
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/50">No card needed · Cancel anytime</p>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}

/** Label pinned to the top of a showcase panel */
function PanelLabel({ icon, tone, title, ink = "light", social }: { icon: LucideIcon; tone: Tone; title: string; ink?: "light" | "dark"; social?: SocialName }) {
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-6 pt-7">
      {social ? <SocialIcon name={social} size={40} label="" className="rounded-xl shadow-lg" /> : <Icon3D icon={icon} tone={tone} size={40} />}
      <span className={`text-lg font-semibold ${ink === "dark" ? "text-zinc-900 dark:text-white" : "text-white"}`}>{title}</span>
    </div>
  );
}
