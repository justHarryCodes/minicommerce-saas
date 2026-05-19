import Link from "next/link";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifySession, getUserStore } from "@/lib/auth";
import { verifyAdminSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { ArrowRight, Check } from "lucide-react";
import ProductSlider, { type ProductSlide } from "./ProductSlider";
import HomeNav from "./HomeNav";

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "Fashion and Clothing":    { icon: "👗", color: "#ec4899" },
  "Shoes and Sneakers":      { icon: "👟", color: "#f97316" },
  "Bags and Accessories":    { icon: "👜", color: "#a855f7" },
  "Beauty and Makeup":       { icon: "💄", color: "#f43f5e" },
  "Hair and Wigs":           { icon: "💇", color: "#06b6d4" },
  "Food and Catering":       { icon: "🍽️", color: "#22c55e" },
  "Electronics and Gadgets": { icon: "⚡", color: "#3b82f6" },
  "Phones and Accessories":  { icon: "📱", color: "#6366f1" },
  "Laptops and Computing":   { icon: "💻", color: "#0ea5e9" },
  "Furniture and Home":      { icon: "🛋️", color: "#84cc16" },
  "Artwork and Paintings":   { icon: "🎨", color: "#f59e0b" },
  "Jewelry and Watches":     { icon: "💎", color: "#14b8a6" },
  "Books and Stationery":    { icon: "📚", color: "#8b5cf6" },
  "Other":                   { icon: "📦", color: "#71717a" },
};

const SHOPPER_FEATURES = [
  "Discover thousands of local vendors in one place",
  "NIN-verified sellers you can trust",
  "Secure payments via Paystack & bank transfer",
  "14+ product categories — fashion, food, tech & more",
  "Direct WhatsApp contact with sellers",
  "Fast, mobile-friendly shopping experience",
];

const SELLER_FEATURES = [
  "Your own branded storefront with a custom URL",
  "Built-in Paystack & bank transfer checkout",
  "Real-time dashboard — orders, revenue & inventory",
  "Product & category management tools",
  "NIN-verified badge to build customer trust",
  "Get promoted in Duka's featured listings & ad campaigns",
  "Start receiving orders in under 10 minutes",
];

export default async function HomePage() {
  // ── Subdomain guard ──────────────────────────────────────────────────────
  // Don't rely on x-is-subdomain header (requires middleware to work).
  // Read the hostname directly — if it's not the root domain, bail out.
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "")
    .split(",")[0].trim().split(":")[0].toLowerCase();

  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "awarizon.shop")
    .toLowerCase()
    .replace(/^www\./, "");

  const isSubdomain =
    host.endsWith(`.${rootDomain}`) &&
    !host.startsWith("www.") &&
    !host.startsWith("localhost");

  if (isSubdomain) {
    // Middleware should have rewritten this to /store/[slug] already.
    // If we're still here, do it manually as a fallback redirect.
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
      []
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
      []
    ),
  ]);

  const totalStores = categoryStats.reduce((sum, c) => sum + parseInt(c.count), 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ── Navbar ─────────────────────────────────────── */}
      <HomeNav />

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-[0.15] blur-3xl"
            style={{ background: "radial-gradient(ellipse, #f59e0b 0%, transparent 70%)" }}
          />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="Duka" className="h-14 w-auto object-contain mb-2" />
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              by Awarizon
            </span>
          </div>

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 text-black"
            style={{ background: "var(--accent-light)" }}
          >
            {totalStores > 0
              ? `${totalStores}+ stores live on Duka`
              : "Nigeria's marketplace platform"}
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.1]"
            style={{ color: "var(--text-primary)" }}
          >
            Discover the best
            <br />
            <span style={{ color: "var(--accent)" }}>local vendors</span> online
          </h1>

          <p
            className="text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Duka connects you with thousands of verified sellers across fashion,
            electronics, food, and more. Or launch your own store in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/discover"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-black text-lg transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "var(--accent)" }}
            >
              Discover Stores
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg border transition-all hover:opacity-80"
              style={{ color: "var(--text-primary)", borderColor: "var(--border-strong)" }}
            >
              Become a Vendor
            </Link>
          </div>
        </div>
      </section>

      {/* ── Category grid ──────────────────────────────── */}
      {categoryStats.length > 0 && (
        <section className="py-20 px-4" style={{ background: "var(--bg-secondary)" }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-black mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Shop by Category
              </h2>
              <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
                Find exactly what you&apos;re looking for across all categories
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {categoryStats.map(({ primary_category, count }) => {
                const meta = CATEGORY_META[primary_category] ?? CATEGORY_META["Other"];
                return (
                  <Link
                    key={primary_category}
                    href={`/discover?category=${encodeURIComponent(primary_category)}`}
                    className="group flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-1"
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                      style={{ background: `${meta.color}1a` }}
                    >
                      {meta.icon}
                    </div>
                    <div className="text-center">
                      <p
                        className="text-sm font-semibold leading-tight mb-1"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {primary_category}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {count} {parseInt(count) === 1 ? "store" : "stores"}
                      </p>
                    </div>
                  </Link>
                );
              })}

              <Link
                href="/discover"
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-dashed transition-all hover:shadow-lg hover:-translate-y-1"
                style={{ borderColor: "var(--border-strong)" }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl">
                  🔍
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                    View All
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Explore all stores
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Features ───────────────────────────────────── */}
      <section className="py-24 px-4" style={{ background: "var(--bg)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
              Why Duka
            </p>
            <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: "var(--text-primary)" }}>
              Everything included,{" "}
              <span style={{ color: "var(--accent)" }}>from day one</span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              Built for both sides of the marketplace — whether you&apos;re shopping or selling,
              Duka has you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* For Shoppers */}
            <div
              className="rounded-3xl p-8 sm:p-10 flex flex-col"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
                  style={{ background: "#6366f118" }}
                >
                  🛍️
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6366f1" }}>
                    For Shoppers
                  </p>
                  <h3 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                    Shop with confidence
                  </h3>
                </div>
              </div>

              <ul className="space-y-4 flex-1 mb-8">
                {SHOPPER_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                      style={{ background: "#6366f118" }}
                    >
                      <Check className="w-3 h-3" style={{ color: "#6366f1" }} />
                    </span>
                    <span className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/discover"
                className="inline-flex items-center gap-2 self-start px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: "#6366f118", color: "#6366f1" }}
              >
                Browse stores <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* For Sellers */}
            <div
              className="rounded-3xl p-8 sm:p-10 flex flex-col"
              style={{ background: "var(--accent)", border: "1px solid transparent" }}
            >
              <div className="absolute" aria-hidden="true" />
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-black/10">
                  🏪
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-black/50">
                    For Sellers
                  </p>
                  <h3 className="text-xl font-black text-black">Sell without limits</h3>
                </div>
              </div>

              <ul className="space-y-4 flex-1 mb-8">
                {SELLER_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-black/10">
                      <Check className="w-3 h-3 text-black" />
                    </span>
                    <span className="text-sm leading-relaxed text-black/75">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 self-start px-6 py-3 rounded-xl text-sm font-semibold bg-black text-white transition-all hover:opacity-80"
              >
                Create your store <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Stat bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10">
            {[
              { value: "14+", label: "Product categories" },
              { value: "₦0", label: "To browse & discover" },
              { value: "10 min", label: "To launch your store" },
              { value: "100%", label: "Nigerian-focused" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="text-center p-5 rounded-2xl border"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
              >
                <p className="text-2xl sm:text-3xl font-black mb-1" style={{ color: "var(--text-primary)" }}>
                  {value}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product slider ─────────────────────────────── */}
      {products.length > 0 && (
        <section className="py-20 px-4" style={{ background: "var(--bg-secondary)" }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                  Live listings
                </p>
                <h2 className="text-3xl sm:text-4xl font-black" style={{ color: "var(--text-primary)" }}>
                  Fresh from our vendors
                </h2>
                <p className="text-base mt-2" style={{ color: "var(--text-secondary)" }}>
                  Real products from real sellers — updated every visit
                </p>
              </div>
              <Link
                href="/discover"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold hover:underline shrink-0"
                style={{ color: "var(--accent)" }}
              >
                View all stores <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <ProductSlider products={products} />

            <div className="text-center mt-8 sm:hidden">
              <Link
                href="/discover"
                className="inline-flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: "var(--accent)" }}
              >
                View all stores <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Vendor CTA ─────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div
            className="rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden"
            style={{ background: "var(--accent)" }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white opacity-10" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-black opacity-5" />
            </div>
            <div className="relative">
              <p className="text-sm font-semibold mb-4 text-black/60 uppercase tracking-wider">
                For Vendors
              </p>
              <h2 className="text-4xl sm:text-5xl font-black mb-4 text-black">
                Start selling today
              </h2>
              <p className="text-lg text-black/70 max-w-xl mx-auto mb-8">
                Create your online store in minutes. Accept payments, manage orders, and grow
                your business — all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold bg-black text-white text-lg transition-all hover:opacity-80 hover:scale-[1.02]"
                >
                  Create Free Store
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-black text-lg border-2 border-black/20 transition-all hover:border-black/40 hover:bg-black/5"
                >
                  I already have a store
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="py-10 px-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex flex-col items-start gap-0.5">
            <img src="/logo.png" alt="Duka" className="h-7 w-auto object-contain" />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>by Awarizon</span>
          </Link>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Duka by Awarizon. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/discover" className="text-xs hover:underline" style={{ color: "var(--text-secondary)" }}>
              Discover
            </Link>
            <Link href="/auth/login" className="text-xs hover:underline" style={{ color: "var(--text-secondary)" }}>
              Login
            </Link>
            <Link href="/auth/signup" className="text-xs hover:underline" style={{ color: "var(--text-secondary)" }}>
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}