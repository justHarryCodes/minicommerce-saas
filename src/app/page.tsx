import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, getUserStore } from "@/lib/auth";
import { verifyAdminSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import {
  ArrowRight,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  MessageCircle,
  Smartphone,
  Wallet,
  LayoutDashboard,
  Store,
  Megaphone,
  Zap,
  Plus,
} from "lucide-react";
import ProductSlider, { type ProductSlide } from "./ProductSlider";
import HomeNav from "./HomeNav";
import Footer from "@/components/Footer";

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

const U = (id: string, w = 900, h = 700) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=80`;

const IMG = {
  fashion: U("photo-1483985988355-763728e1935b", 500, 600),
  food: U("photo-1567620905732-2d1ec7ab7445", 500, 600),
  tech: U("photo-1488590528505-98d2b5aba04b", 500, 600),
  beauty: U("photo-1522335789203-aabd1fc54bc9", 500, 600),
  owner: U("photo-1556742049-0cfed4f6a45d", 1000, 800),
  checkout: U("photo-1556742502-ec7c0e9f34b1", 1000, 800),
  dashboard: U("photo-1551288049-bebda4e38f71", 1000, 800),
  shop: U("photo-1441986300917-64674bd600d8", 1000, 800),
  phone: U("photo-1512941937669-90a1b58e7e9c", 1000, 800),
  cta: U("photo-1607082348824-0a96f2a4b9da", 1600, 900),
};

const PAINS = [
  {
    emoji: "💬",
    title: "Orders buried in DMs",
    text: "Prices, sizes, addresses and “is this still available?” scattered across a hundred chats.",
  },
  {
    emoji: "🧾",
    title: "Chasing payment proof",
    text: "Screenshots of transfers, fake alerts and customers who go quiet after “I’ll pay tomorrow”.",
  },
  {
    emoji: "🤷",
    title: "Customers don’t trust you yet",
    text: "No proper store, no reviews page, no badge. Strangers hesitate to send money.",
  },
  {
    emoji: "📉",
    title: "Only your followers can find you",
    text: "If they’re not already in your audience, they will never see what you sell.",
  },
];

const BENEFITS = [
  {
    eyebrow: "Your store",
    title: "A real branded store, live in minutes",
    text: "Get your own storefront with your logo, your products and your own dukanigeria.com link. Put it in your bio, status and every chat. One link replaces every “send me pictures” conversation.",
    points: [
      "Custom store URL you can share anywhere",
      "Looks great on phones, where your customers are",
      "Categories and subcategories set up by AI",
    ],
    image: IMG.shop,
    icon: Store,
  },
  {
    eyebrow: "Get paid",
    title: "Checkout that collects the money for you",
    text: "Customers pick items, enter their details and pay by card or bank transfer through Paystack. No back and forth, no guessing whether the alert is real.",
    points: [
      "Paystack and bank transfer built in",
      "Orders arrive organised, with customer details attached",
      "Customers can still WhatsApp you with one tap",
    ],
    image: IMG.checkout,
    icon: Wallet,
  },
  {
    eyebrow: "Run it",
    title: "A dashboard that shows how your business is doing",
    text: "See orders, revenue and stock in one place instead of in your head or a notebook. Update a price or mark something sold out in seconds.",
    points: [
      "Real-time orders and revenue",
      "Inventory that updates as you sell",
      "Product and category management tools",
    ],
    image: IMG.dashboard,
    icon: LayoutDashboard,
  },
  {
    eyebrow: "Get found",
    title: "Be discovered by people who don’t follow you yet",
    text: "Your store is listed on the Duka marketplace, where shoppers browse vendors and products by category. Post reels, earn the verified badge and get promoted in featured listings and ad campaigns.",
    points: [
      "Listed in the Duka vendor directory",
      "Verified badge builds instant trust",
      "Featured listings and ad campaigns to boost sales",
    ],
    image: IMG.phone,
    icon: Megaphone,
  },
];

const BENTO = [
  {
    icon: Sparkles,
    title: "AI store setup",
    text: "Describe what you sell in plain language and your categories are built for you.",
  },
  {
    icon: ShieldCheck,
    title: "Verified badge",
    text: "Show shoppers you’re a real business they can buy from.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp contact",
    text: "Customers reach you directly when they have questions.",
  },
  {
    icon: Smartphone,
    title: "Mobile first",
    text: "Fast, clean and easy to shop on any phone.",
  },
  {
    icon: Zap,
    title: "AI product descriptions",
    text: "Upload a photo and let AI help you write the copy.",
  },
  {
    icon: Wallet,
    title: "Free to start",
    text: "No card required. Upgrade only when you’re ready.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Create your account",
    text: "Sign up free with your email or phone. It takes under a minute and needs no card.",
    image: IMG.owner,
  },
  {
    step: "2",
    title: "Tell AI what you sell",
    text: "Describe your business and your categories and subcategories are set up for you.",
    image: IMG.tech,
  },
  {
    step: "3",
    title: "Add your products",
    text: "Upload photos, set prices and stock. AI can help write the descriptions.",
    image: IMG.fashion,
  },
  {
    step: "4",
    title: "Share your link and sell",
    text: "Post your store link everywhere, accept Paystack or bank transfer and watch orders arrive.",
    image: IMG.beauty,
  },
];

const COMPARE = [
  ["Orders", "Scattered across chats", "One organised order list"],
  [
    "Payments",
    "Screenshots and “I’ve sent it”",
    "Paystack and bank transfer at checkout",
  ],
  [
    "Trust",
    "Customers have to take your word",
    "Branded store with a verified badge",
  ],
  ["Stock", "Tracked in your head", "Updates as you sell"],
  ["Reach", "Only people who follow you", "Listed in the Duka marketplace"],
  ["Sharing", "Send photos one by one", "One link to your whole catalogue"],
];

const FAQ = [
  {
    q: "Is it really free to start?",
    a: "Yes. You can create your store without a card and start adding products straight away. See the pricing page for plan details when you’re ready to grow.",
  },
  {
    q: "Do I need technical skills?",
    a: "No. If you can post on WhatsApp or Instagram, you can set up a Duka store. AI helps organise your categories and write product descriptions.",
  },
  {
    q: "How do I get paid?",
    a: "Customers can pay with Paystack or bank transfer at checkout, so you are not chasing payment proofs in chat.",
  },
  {
    q: "Can customers still chat with me?",
    a: "Yes. Your store includes direct WhatsApp contact, so shoppers can ask questions and you keep the personal touch.",
  },
  {
    q: "How will customers find my store?",
    a: "Share your store link anywhere you already sell, and shoppers can also discover you through the Duka marketplace by browsing categories and products.",
  },
  {
    q: "What can I sell?",
    a: "Fashion, shoes, beauty, hair, food, electronics, phones, furniture, art, jewelry, books and more. There are 14+ categories to choose from.",
  },
];

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
    const store = await getUserStore(user.firebaseUid);
    redirect(store ? "/dashboard" : "/onboarding");
  }

  const [categoryStats, products] = await Promise.all([
    query<{ primary_category: string; count: string }>(
      `SELECT primary_category, COUNT(*) as count
       FROM stores
       WHERE is_active = true AND primary_category IS NOT NULL
       GROUP BY primary_category
       ORDER BY count DESC`,
      [],
    ),
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
  ]);

  const totalStores = categoryStats.reduce(
    (sum, c) => sum + parseInt(c.count),
    0,
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <HomeNav />

      {/* ═════════════ HERO ═════════════ */}
      <section className="relative overflow-hidden px-4 pb-20 pt-14 sm:pt-20 lg:pb-28">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-[-120px] h-[620px] w-[1000px] -translate-x-1/2 rounded-full opacity-[0.18] blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse, #f59e0b 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="text-center lg:text-left">
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-black"
              style={{ background: "var(--accent-light)" }}
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
              {totalStores > 0
                ? `${totalStores}+ stores already selling on Duka`
                : "Built for Nigerian sellers"}
            </div>

            <h1
              className="mb-6 text-[2.6rem] font-black leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl"
              style={{ color: "var(--text-primary)" }}
            >
              Stop selling in DMs.
              <br />
              Start running a{" "}
              <span
                className="relative inline-block"
                style={{ color: "var(--accent)" }}
              >
                real store
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M2 9C50 2 150 2 198 9"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              .
            </h1>

            <p
              className="mx-auto mb-9 max-w-xl text-lg leading-relaxed sm:text-xl lg:mx-0"
              style={{ color: "var(--text-secondary)" }}
            >
              Give your business a branded online store with built-in checkout,
              a sales dashboard and a marketplace full of shoppers. Live in 10
              minutes, no tech skills needed.
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row lg:justify-start sm:justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-black shadow-lg transition-all hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] sm:w-auto"
                style={{ background: "var(--accent)" }}
              >
                Create your free store
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/discover"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-8 py-4 text-lg font-semibold transition-all hover:opacity-80 sm:w-auto"
                style={{
                  color: "var(--text-primary)",
                  borderColor: "var(--border-strong)",
                }}
              >
                See live stores
              </Link>
            </div>

            <ul
              className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium lg:justify-start"
              style={{ color: "var(--text-secondary)" }}
            >
              {[
                "Free to start",
                "No card required",
                "Paystack and bank transfer",
              ].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check
                    className="h-4 w-4"
                    style={{ color: "var(--accent)" }}
                  />{" "}
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero visual: storefront mock */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              className="relative overflow-hidden rounded-[2rem] border shadow-2xl"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            >
              <div
                className="flex items-center gap-1.5 border-b px-4 py-3"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-secondary)",
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <div
                  className="ml-3 flex-1 rounded-full px-3 py-1 text-[11px] font-medium"
                  style={{
                    background: "var(--bg)",
                    color: "var(--text-muted)",
                  }}
                >
                  yourbrand.dukanigeria.com
                </div>
              </div>

              <div className="p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-black"
                    style={{ background: "var(--accent)" }}
                  >
                    Y
                  </div>
                  <div className="flex-1">
                    <p
                      className="flex items-center gap-1.5 text-sm font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Your Brand
                      <ShieldCheck className="h-4 w-4 text-blue-500" />
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Fashion and Clothing
                    </p>
                  </div>
                  <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-600">
                    Open
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      src: IMG.fashion,
                      name: "Ankara co-ord set",
                      price: "₦28,500",
                    },
                    {
                      src: IMG.beauty,
                      name: "Glow skincare kit",
                      price: "₦15,000",
                    },
                    {
                      src: IMG.tech,
                      name: "Wireless earbuds",
                      price: "₦22,000",
                    },
                    {
                      src: IMG.food,
                      name: "Party jollof tray",
                      price: "₦35,000",
                    },
                  ].map((p) => (
                    <div
                      key={p.name}
                      className="overflow-hidden rounded-xl border"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div
                        className="relative aspect-[4/3]"
                        style={{ background: "var(--bg-tertiary)" }}
                      >
                        <Image
                          src={p.src}
                          alt={p.name}
                          fill
                          sizes="200px"
                          className="object-cover"
                        />
                      </div>
                      <div className="p-2.5">
                        <p
                          className="truncate text-xs font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {p.name}
                        </p>
                        <p
                          className="text-xs font-bold"
                          style={{ color: "var(--accent)" }}
                        >
                          {p.price}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating notifications (illustrative) */}
            <div
              className="absolute -left-3 top-24 hidden items-center gap-3 rounded-2xl border p-3 pr-5 shadow-xl sm:flex lg:-left-10"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15 text-lg">
                🎉
              </span>
              <div>
                <p
                  className="text-xs font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  New order received
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Paid via Paystack
                </p>
              </div>
            </div>
            <div
              className="absolute -right-3 bottom-16 hidden items-center gap-3 rounded-2xl border p-3 pr-5 shadow-xl sm:flex lg:-right-8"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={{ background: "var(--accent-light)" }}
              >
                🛍️
              </span>
              <div>
                <p
                  className="text-xs font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Customer from Discover
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Found you in Fashion
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ TRUST STRIP ═════════════ */}
      <section
        className="border-y px-4 py-8"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 text-center md:grid-cols-4">
          {[
            {
              v: totalStores > 0 ? `${totalStores}+` : "Growing",
              l: "Stores on Duka",
            },
            { v: "14+", l: "Product categories" },
            { v: "10 min", l: "To launch your store" },
            { v: "₦0", l: "To get started" },
          ].map(({ v, l }) => (
            <div key={l}>
              <p
                className="text-2xl font-black sm:text-3xl"
                style={{ color: "var(--text-primary)" }}
              >
                {v}
              </p>
              <p
                className="text-xs sm:text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {l}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═════════════ PROBLEM ═════════════ */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--accent)" }}
            >
              Sound familiar?
            </p>
            <h2
              className="mb-4 text-3xl font-black tracking-tight sm:text-5xl"
              style={{ color: "var(--text-primary)" }}
            >
              Great products. Messy selling.
            </h2>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
              Social media is great for attention and terrible for running a
              business. Here’s what it costs you every week.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PAINS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border p-6"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                  style={{ background: "var(--bg-tertiary)" }}
                >
                  {p.emoji}
                </div>
                <h3
                  className="mb-2 text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {p.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {p.text}
                </p>
              </div>
            ))}
          </div>

          <p
            className="mt-12 text-center text-xl font-black sm:text-2xl"
            style={{ color: "var(--text-primary)" }}
          >
            Duka fixes all four.{" "}
            <span style={{ color: "var(--accent)" }}>Here’s how ↓</span>
          </p>
        </div>
      </section>

      {/* ═════════════ BENEFITS ═════════════ */}
      <section
        id="for-vendors"
        className="scroll-mt-16 px-4 pb-8 sm:pb-16"
        style={{ background: "var(--bg)" }}
      >
        <div className="mx-auto max-w-7xl space-y-20 sm:space-y-28">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            const flip = i % 2 === 1;
            return (
              <div
                key={b.title}
                className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
              >
                <div className={flip ? "lg:order-2" : ""}>
                  <div
                    className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                    style={{ background: "var(--accent-light)", color: "#000" }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {b.eyebrow}
                  </div>
                  <h2
                    className="mb-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {b.title}
                  </h2>
                  <p
                    className="mb-6 text-base leading-relaxed sm:text-lg"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {b.text}
                  </p>
                  <ul className="space-y-3">
                    {b.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={{ background: "var(--accent)" }}
                        >
                          <Check className="h-3 w-3 text-black" />
                        </span>
                        <span
                          className="text-sm font-medium sm:text-base"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {pt}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={flip ? "lg:order-1" : ""}>
                  <div className="relative">
                    <div
                      className="absolute -inset-3 rotate-2 rounded-[2rem] opacity-30"
                      style={{ background: "var(--accent)" }}
                      aria-hidden
                    />
                    <div
                      className="relative aspect-[5/4] overflow-hidden rounded-[1.75rem] shadow-2xl"
                      style={{ background: "var(--bg-tertiary)" }}
                    >
                      <Image
                        src={b.image}
                        alt={b.title}
                        fill
                        sizes="(min-width: 1024px) 45vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═════════════ BENTO ═════════════ */}
      <section
        className="px-4 py-20 sm:py-28"
        style={{ background: "var(--bg-secondary)" }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--accent)" }}
            >
              Everything included
            </p>
            <h2
              className="mb-4 text-3xl font-black tracking-tight sm:text-5xl"
              style={{ color: "var(--text-primary)" }}
            >
              All the tools.{" "}
              <span style={{ color: "var(--accent)" }}>
                None of the stress.
              </span>
            </h2>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
              Everything a growing online business needs, ready from day one.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENTO.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="group rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                  style={{ background: "var(--accent)" }}
                >
                  <Icon className="h-5 w-5 text-black" />
                </div>
                <h3
                  className="mb-1.5 text-base font-bold"
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
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ COMPARISON ═════════════ */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--accent)" }}
            >
              The difference
            </p>
            <h2
              className="text-3xl font-black tracking-tight sm:text-5xl"
              style={{ color: "var(--text-primary)" }}
            >
              DMs vs. your Duka store
            </h2>
          </div>

          <div
            className="overflow-hidden rounded-3xl border"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="grid grid-cols-[0.8fr_1fr_1fr] text-xs font-bold uppercase tracking-wider sm:text-sm"
              style={{ background: "var(--bg-secondary)" }}
            >
              <div className="p-4" />
              <div className="p-4" style={{ color: "var(--text-muted)" }}>
                Selling in DMs
              </div>
              <div
                className="p-4 text-black"
                style={{ background: "var(--accent)" }}
              >
                With Duka
              </div>
            </div>
            {COMPARE.map(([label, before, after]) => (
              <div
                key={label}
                className="grid grid-cols-[0.8fr_1fr_1fr] border-t text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="p-4 font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {label}
                </div>
                <div
                  className="flex items-start gap-2 p-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  {before}
                </div>
                <div
                  className="flex items-start gap-2 p-4 font-medium"
                  style={{
                    color: "var(--text-primary)",
                    background: "var(--accent-light)",
                  }}
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                  {after}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ HOW IT WORKS ═════════════ */}
      <section
        className="px-4 py-20 sm:py-28"
        style={{ background: "var(--bg-secondary)" }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--accent)" }}
            >
              How it works
            </p>
            <h2
              className="mb-4 text-3xl font-black tracking-tight sm:text-5xl"
              style={{ color: "var(--text-primary)" }}
            >
              From idea to first order in 4 steps
            </h2>
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
              No developers, no design work, no setup fees to start.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="group overflow-hidden rounded-3xl border"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="relative aspect-[4/3]"
                  style={{ background: "var(--bg-tertiary)" }}
                >
                  <Image
                    src={s.image}
                    alt={s.title}
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span
                    className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl text-base font-black text-black shadow-lg"
                    style={{ background: "var(--accent)" }}
                  >
                    {s.step}
                  </span>
                </div>
                <div className="p-5">
                  <h3
                    className="mb-1.5 text-base font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {s.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-black shadow-lg transition-all hover:scale-[1.02] hover:opacity-95"
              style={{ background: "var(--accent)" }}
            >
              Start your store free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═════════════ MARKETPLACE / LIVE PRODUCTS ═════════════ */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p
                className="mb-3 text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--accent)" }}
              >
                Shoppers are already here
              </p>
              <h2
                className="mb-3 text-3xl font-black tracking-tight sm:text-5xl"
                style={{ color: "var(--text-primary)" }}
              >
                Your products, in front of new customers
              </h2>
              <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
                Every Duka store is listed in the marketplace. These are real
                products from real sellers, refreshed every visit.
              </p>
            </div>
            <Link
              href="/discover"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold hover:underline"
              style={{ color: "var(--accent)" }}
            >
              Browse the marketplace <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {categoryStats.length > 0 && (
            <div className="-mx-4 mb-10 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categoryStats.map(({ primary_category, count }) => {
                const meta =
                  CATEGORY_META[primary_category] ?? CATEGORY_META["Other"];
                return (
                  <Link
                    key={primary_category}
                    href={`/discover?category=${encodeURIComponent(primary_category)}`}
                    className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{
                      background: "var(--bg)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <span>{meta.icon}</span>
                    {primary_category}
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {products.length > 0 && <ProductSlider products={products} />}
        </div>
      </section>

      {/* ═════════════ AFFILIATE ═════════════ */}
      {/* <section className="px-4 pb-6">
        <div className="mx-auto max-w-7xl">
          <div
            className="flex flex-col items-center gap-6 rounded-3xl border px-8 py-10 sm:flex-row sm:gap-10 sm:px-14"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
              style={{ background: "var(--accent-light)" }}
            >
              💰
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p
                className="mb-1 text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--accent)" }}
              >
                Affiliate Program
              </p>
              <h3
                className="mb-1 text-xl font-black sm:text-2xl"
                style={{ color: "var(--text-primary)" }}
              >
                Know a seller? Earn ₦2,000 for every vendor you refer
              </h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Share your link. When a vendor activates, you get paid. No cap
                on earnings.
              </p>
            </div>
            <Link
              href="/affiliate"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              Join free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section> */}

      {/* ═════════════ FAQ ═════════════ */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <p
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--accent)" }}
            >
              FAQ
            </p>
            <h2
              className="text-3xl font-black tracking-tight sm:text-5xl"
              style={{ color: "var(--text-primary)" }}
            >
              Questions sellers ask
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border px-6 py-5 open:shadow-md"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                }}
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold [&::-webkit-details-marker]:hidden"
                  style={{ color: "var(--text-primary)" }}
                >
                  {q}
                  <Plus
                    className="h-5 w-5 shrink-0 transition-transform group-open:rotate-45"
                    style={{ color: "var(--accent)" }}
                  />
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

          <p
            className="mt-8 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Want plan details?{" "}
            <Link
              href="/pricing"
              className="font-semibold underline"
              style={{ color: "var(--text-primary)" }}
            >
              See pricing
            </Link>
          </p>
        </div>
      </section>

      {/* ═════════════ FINAL CTA ═════════════ */}
      <section className="px-4 pb-20">
        <div
          className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem]"
          style={{ background: "#111" }}
        >
          <Image
            src={IMG.cta}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
          <div className="relative px-8 py-16 sm:px-16 sm:py-24">
            <p
              className="mb-4 text-sm font-bold uppercase tracking-widest"
              style={{ color: "var(--accent)" }}
            >
              Your customers are waiting
            </p>
            <h2 className="mb-5 max-w-2xl text-4xl font-black leading-tight text-white sm:text-6xl">
              Your business deserves more than a chat thread.
            </h2>
            <p className="mb-9 max-w-xl text-lg text-white/75">
              Create your free Duka store today. Accept payments, manage orders
              and get discovered by new customers, all in one place.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-black shadow-lg transition-all hover:scale-[1.02] hover:opacity-95"
                style={{ background: "var(--accent)" }}
              >
                Create free store
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/25 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-white/10"
              >
                I already have a store
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ FOOTER ═════════════ */}
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
          Create your free store <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
