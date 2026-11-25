import Link from "next/link";
import { ArrowRight, ArrowUpRight, Mail, MessageCircle, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import DukaLogo from "@/components/DukaLogo";
import GooglePlayBadge from "@/components/GooglePlayBadge";
import SocialIcon, { type SocialName } from "@/components/SocialIcon";

type FooterLink = { href: string; label: string; tag?: string };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/#tools", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/discover", label: "Marketplace" },
      { href: "/affiliate", label: "Affiliates" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/resources", label: "Help centre" },
      { href: "/blog", label: "Blog" },
      { href: "/grant", label: "Vendor Grant", tag: "New" },
      { href: "https://brandkit.dukanigeria.com", label: "Brand kit" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/data-deletion", label: "Data deletion" },
      { href: "mailto:support@dukanigeria.com", label: "Contact support" },
    ],
  },
  {
    title: "Get started",
    links: [
      { href: "/auth/signup", label: "Create a free store" },
      { href: "/auth/login", label: "Log in" },
      { href: "/discover", label: "Shop Duka stores" },
    ],
  },
];

const TRUST: { icon: LucideIcon; social?: SocialName; title: string; text: string }[] = [
  { icon: ShieldCheck, title: "Secure payments", text: "Card, transfer and USSD via Paystack" },
  { icon: Truck, title: "Delivery your way", text: "Zones, pickup and pay on delivery" },
  { icon: MessageCircle, social: "whatsapp", title: "Sell on WhatsApp", text: "Share links that turn chats into orders" },
];

function FooterLinkItem({ l }: { l: FooterLink }) {
  const web = l.href.startsWith("http");
  const cls = "group inline-flex items-center gap-1.5 text-[14px] transition-colors hover:text-amber-600 dark:hover:text-amber-400";
  const inner = (
    <>
      {l.label}
      {l.tag && <span className="rounded-full bg-amber-400 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-black">{l.tag}</span>}
      {web && <ArrowUpRight className="h-3 w-3 opacity-50 transition group-hover:opacity-100" />}
    </>
  );
  // Other Duka sites and email links are plain links, not app routes
  return web || l.href.startsWith("mailto:") ? (
    <a href={l.href} className={cls} style={{ color: "var(--text-secondary)" }} {...(web ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {inner}
    </a>
  ) : (
    <Link href={l.href} className={cls} style={{ color: "var(--text-secondary)" }}>
      {inner}
    </Link>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden border-t px-4 pb-28 pt-16 lg:pb-10" style={{ borderColor: "var(--border)", background: "var(--bg-secondary, var(--bg))" }}>
      {/* Soft brand glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-72 w-[720px] -translate-x-1/2 rounded-full bg-amber-400 opacity-[0.08] blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-7xl">
        {/* Brand + links */}
        <div className="grid gap-12 lg:grid-cols-[1.25fr_2fr]">
          <div className="max-w-sm">
            <DukaLogo size={30} />
            <p className="mt-1 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              by Awarizon
            </p>
            <p className="mt-5 text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Everything a Nigerian business needs to sell online: your own store, secure payments, delivery and WhatsApp selling, in one place.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/auth/signup" className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-black transition hover:bg-amber-500">
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>
              <GooglePlayBadge size="sm" />
            </div>
            <a href="mailto:support@dukanigeria.com" className="mt-6 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-amber-600 dark:hover:text-amber-400" style={{ color: "var(--text-secondary)" }}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border" style={{ borderColor: "var(--border)" }}>
                <Mail className="h-4 w-4" />
              </span>
              support@dukanigeria.com
            </a>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-primary)" }}>
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.href + l.label}>
                      <FooterLinkItem l={l} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Why Duka */}
        <div className="mt-14 grid gap-3 rounded-3xl border p-4 sm:grid-cols-3 sm:p-5" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          {TRUST.map((t) => (
            <div key={t.title} className="flex items-center gap-3 rounded-2xl px-2 py-1.5">
              {t.social ? (
                <SocialIcon name={t.social} size={40} label="" className="rounded-xl" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <t.icon className="h-5 w-5" />
                </span>
              )}
              <span>
                <span className="block text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {t.title}
                </span>
                <span className="block text-[13px]" style={{ color: "var(--text-muted)" }}>
                  {t.text}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t pt-6 sm:flex-row" style={{ borderColor: "var(--border)" }}>
          <p className="text-center text-[13px] sm:text-left" style={{ color: "var(--text-muted)" }}>
            © {year} Duka by Awarizon. All rights reserved. ·{" "}
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              Made in Nigeria
              {/* Drawn flag: Windows doesn't show flag emoji */}
              <svg width="18" height="12" viewBox="0 0 3 2" aria-hidden className="rounded-[2px] ring-1 ring-black/10">
                <rect width="1" height="2" fill="#008751" />
                <rect x="1" width="1" height="2" fill="#fff" />
                <rect x="2" width="1" height="2" fill="#008751" />
              </svg>
            </span>
          </p>
          <div className="flex items-center gap-5 text-[13px]" style={{ color: "var(--text-muted)" }}>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/data-deletion" className="hover:underline">Data deletion</Link>
          </div>
        </div>

        {/* Big outlined wordmark */}
        <p className="pointer-events-none mt-10 select-none text-center text-[22vw] font-black leading-[0.8] tracking-tighter text-transparent [-webkit-text-stroke:1px_var(--border)] lg:text-[200px]" aria-hidden>
          DUKA
        </p>
      </div>
    </footer>
  );
}
