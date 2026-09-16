import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, CreditCard, Film, LayoutDashboard, TrendingUp, ShieldCheck, Megaphone } from "lucide-react";
import HomeNav from "../HomeNav";

export const metadata = {
  title: "Resources · Duka by Awarizon",
  description: "Guides and articles to help you set up, run, and grow your store on Duka.",
};

const GUIDES = [
  {
    icon: Sparkles,
    title: "Set up your store with AI in one message",
    body: "Describe what you sell in plain language during onboarding — Duka's AI organises your categories and subcategories automatically, so you skip the busywork and start listing products right away.",
  },
  {
    icon: CreditCard,
    title: "Getting paid: Paystack vs. bank transfer",
    body: "Accept cards, bank transfers, and USSD instantly via Paystack, or confirm manual bank transfers yourself from your dashboard. Set up both, or whichever suits how you already do business.",
  },
  {
    icon: LayoutDashboard,
    title: "A tour of your dashboard",
    body: "Track orders, manage stock levels, update your storefront banner and featured products, and see everything customers see — all from one place, on desktop or your phone.",
  },
  {
    icon: Film,
    title: "Showcase products with Reels",
    body: "Upload short product videos that appear in Duka's Discover feed. Available on Pro and Business plans — a fast way to catch a shopper's eye before they even reach your store.",
  },
];

const ARTICLES = [
  {
    icon: TrendingUp,
    title: "Why Nigerian vendors are moving online",
    body: "Foot traffic has a ceiling; a store link you can share on WhatsApp and Instagram doesn't. A look at what changes when your storefront isn't limited to people walking past it.",
  },
  {
    icon: ShieldCheck,
    title: "Building customer trust without a physical shop",
    body: "Clear product photos, honest stock counts, a real delivery address, and fast replies do more for trust online than a shop signboard ever could. Practical habits that convert first-time visitors into buyers.",
  },
  {
    icon: Megaphone,
    title: "Getting your first sale faster",
    body: "Share your store link everywhere you already talk to customers — WhatsApp status, Instagram bio, group chats. Duka's affiliate program also lets your first customers earn by referring the next ones.",
  },
];

function Card({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div
      className="rounded-2xl border p-6 flex flex-col h-full"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
        style={{ background: "var(--accent-light)" }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-base font-bold mb-2 leading-snug" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {body}
      </p>
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <HomeNav />

      {/* ── Header ───────────────────────────────────────── */}
      <section className="pt-20 pb-14 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
            Resources
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-5" style={{ color: "var(--text-primary)" }}>
            Guides & articles
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Everything you need to set up, run, and grow your store — written by the Duka team.
          </p>
        </div>
      </section>

      {/* ── Guides ───────────────────────────────────────── */}
      <section id="guides" className="px-4 pb-20 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black mb-8" style={{ color: "var(--text-primary)" }}>
            Guides
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {GUIDES.map((g) => (
              <Card key={g.title} {...g} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Articles ─────────────────────────────────────── */}
      <section id="articles" className="px-4 pb-24 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black mb-8" style={{ color: "var(--text-primary)" }}>
            Articles
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ARTICLES.map((a) => (
              <Card key={a.title} {...a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="px-4 pb-24">
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-3xl p-10 sm:p-14 text-center"
            style={{ background: "var(--accent)" }}
          >
            <h2 className="text-2xl sm:text-3xl font-black mb-3 text-black">
              Ready to put this into practice?
            </h2>
            <p className="text-base text-black/70 mb-7 max-w-lg mx-auto">
              Create your free store today and start applying what you just read.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold bg-black text-white text-base transition-all hover:opacity-80 hover:scale-[1.02]"
            >
              Create your free store
              <ArrowRight className="w-4 h-4" />
            </Link>
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
