import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, CheckCircle2, DollarSign, Users, Wallet,
  BarChart3, Link2, ShieldCheck, Clock, HelpCircle,
} from "lucide-react";
import HomeNav from "../HomeNav";

export const metadata = { title: "Affiliate Program — Duka by Awarizon" };

const STEPS = [
  {
    step: "01",
    icon: Users,
    title: "Create your free account",
    desc: "Sign up in under 60 seconds. No approval process, no waiting — your affiliate link is ready immediately.",
  },
  {
    step: "02",
    icon: Link2,
    title: "Share your referral link",
    desc: "Promote Duka to entrepreneurs, business owners, and anyone looking to sell online. Use social media, WhatsApp, email — anywhere.",
  },
  {
    step: "03",
    icon: DollarSign,
    title: "Earn ₦2,000 per activation",
    desc: "When a vendor you referred registers and pays their setup fee, ₦2,000 is instantly credited to your affiliate balance.",
  },
];

const PERKS = [
  { icon: DollarSign, label: "₦2,000 per activation", desc: "Earn for every vendor who pays their setup fee" },
  { icon: Wallet,     label: "₦5,000 minimum payout", desc: "Reach the threshold, request your payout anytime" },
  { icon: BarChart3,  label: "Real-time dashboard",   desc: "Track every referral, earning, and payout live" },
  { icon: ShieldCheck,label: "Secure & reliable",     desc: "Payouts reviewed and sent directly to your bank" },
  { icon: Clock,      label: "Lifetime tracking",     desc: "Your referral link works forever — no expiry" },
  { icon: Users,      label: "No cap on earnings",    desc: "Refer as many vendors as you want, earn unlimited" },
];

const FAQS = [
  {
    q: "Who can join the affiliate program?",
    a: "Anyone! Whether you're a content creator, student, business owner, or just someone with a network — you can sign up and start earning.",
  },
  {
    q: "When do I earn the commission?",
    a: "You earn ₦2,000 when a vendor you referred successfully registers their store AND pays the platform setup fee. Simply signing up doesn't count.",
  },
  {
    q: "How do I get paid?",
    a: "Once your balance reaches ₦5,000 or more, you can request a payout directly to your Nigerian bank account. Our team processes it manually and marks it paid.",
  },
  {
    q: "Is there a limit to how much I can earn?",
    a: "No cap at all. Refer 100 vendors, earn ₦200,000. The more you promote, the more you earn.",
  },
  {
    q: "What happens if a referred vendor doesn't pay?",
    a: "No commission is earned until the setup fee is paid. Referrals show as 'pending' in your dashboard until that happens.",
  },
  {
    q: "Can I also be a vendor on Duka?",
    a: "Yes! Being an affiliate and a vendor are completely separate. You can do both with the same email if you create both accounts.",
  },
];

export default function AffiliateLandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      <HomeNav />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 sm:py-28 px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-[0.15] blur-3xl"
            style={{ background: "radial-gradient(ellipse, #f59e0b 0%, transparent 70%)" }}
          />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: text */}
            <div className="text-center lg:text-left">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
                style={{ background: "var(--accent-light)", color: "var(--accent-dark)" }}
              >
                <DollarSign className="w-3 h-3" /> Earn ₦2,000 per referral — no cap
              </div>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-6"
                style={{ color: "var(--text-primary)" }}
              >
                Turn your network into
                <br className="hidden sm:block" />
                <span style={{ color: "var(--accent)" }}> real income.</span>
              </h1>
              <p
                className="text-lg sm:text-xl max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Join the Duka Affiliate Program. Share your unique link, invite vendors to sell on Duka,
                and earn ₦2,000 every time one activates — with no limit on how much you can make.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <Link
                  href="/affiliate/signup"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-base text-black transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "var(--accent)" }}
                >
                  Start earning free <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/affiliate/login"
                  className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-2xl border-2 font-semibold text-base transition-colors hover:opacity-80"
                  style={{ color: "var(--text-primary)", borderColor: "var(--border-strong)" }}
                >
                  I have an account
                </Link>
              </div>
              <p className="text-xs mt-5 text-center lg:text-left" style={{ color: "var(--text-muted)" }}>
                Free to join · No approval needed · Instant link
              </p>
            </div>

            {/* Right: photo with floating widgets */}
            <div className="hidden lg:block relative">
              <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=620&h=520&fit=crop&q=80"
                  alt="Affiliate earning on Duka"
                  fill
                  sizes="(min-width: 1024px) 620px, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/15 to-transparent pointer-events-none" />
              </div>

              {/* Floating earnings card — illustrative example, not a real user's data */}
              <div
                className="absolute bottom-8 left-6 rounded-2xl shadow-2xl p-4 min-w-[160px] border"
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                  Example balance
                </p>
                <p className="text-2xl font-black" style={{ color: "var(--accent)" }}>₦18,000</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>9 active referrals</p>
              </div>

              {/* Floating notification */}
              <div
                className="absolute top-8 right-6 rounded-2xl shadow-2xl p-3.5 flex items-center gap-3 border"
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              >
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <span className="text-green-600 font-black text-base">✓</span>
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>+₦2,000</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>New referral paid!</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────── */}
      <section className="border-y py-10 px-4" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center">
          {[
            { value: "₦2,000",  label: "Per active referral" },
            { value: "₦5,000",  label: "Minimum payout" },
            { value: "0%",      label: "Platform fee on earnings" },
            { value: "∞",       label: "Maximum you can earn" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl sm:text-4xl font-black mb-1" style={{ color: "var(--accent)" }}>{value}</p>
              <p className="text-xs sm:text-sm font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-24 px-4" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>Simple process</p>
            <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: "var(--text-primary)" }}>How it works</h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>Three steps stand between you and your first commission.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
            {STEPS.map(({ step, icon: Icon, title, desc }) => (
              <div
                key={step}
                className="relative rounded-3xl p-8 border transition-shadow hover:shadow-lg"
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--accent)" }}>
                    <Icon className="w-5 h-5 text-black" />
                  </div>
                  <span className="text-3xl font-black" style={{ color: "var(--border-strong)" }}>{step}</span>
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Earnings showcase ────────────────────────────────────── */}
      <section id="earnings" className="py-20 sm:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>Your earnings</p>
              <h2 className="text-3xl sm:text-4xl font-black mb-5" style={{ color: "var(--text-primary)" }}>
                The more you share,<br />the more you earn.
              </h2>
              <p className="leading-relaxed mb-8" style={{ color: "var(--text-secondary)" }}>
                There&apos;s no limit on referrals or earnings. Every vendor you bring to Duka who activates their store puts ₦2,000 straight into your affiliate balance. Reach ₦5,000 and you can cash out to any Nigerian bank account.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PERKS.map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 p-4 rounded-2xl border"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--accent-light)" }}>
                      <Icon className="w-4 h-4" style={{ color: "var(--accent-dark)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{label}</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Earnings calculator preview */}
            <div className="space-y-4">
              <div className="rounded-3xl border p-6 sm:p-8" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: "var(--text-muted)" }}>Earnings example</p>
                <div className="space-y-3">
                  {[
                    { referrals: 5,   earning: "₦10,000" },
                    { referrals: 10,  earning: "₦20,000" },
                    { referrals: 25,  earning: "₦50,000" },
                    { referrals: 50,  earning: "₦100,000" },
                    { referrals: 100, earning: "₦200,000" },
                  ].map(({ referrals, earning }) => (
                    <div
                      key={referrals}
                      className="flex items-center justify-between p-4 rounded-2xl border"
                      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-light)" }}>
                          <Users className="w-4 h-4" style={{ color: "var(--accent-dark)" }} />
                        </div>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                          {referrals} active vendor{referrals !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="text-base font-black" style={{ color: "var(--accent)" }}>{earning}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-4 text-center" style={{ color: "var(--text-muted)" }}>Based on ₦2,000 per active referral</p>
              </div>

              {/* Dashboard preview card — illustrative mockup, not real user data */}
              <div className="rounded-3xl border shadow-sm p-6" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Your dashboard</p>
                  <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Example preview</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "Total referrals", value: "24", color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Active",           value: "18", color: "text-green-600", bg: "bg-green-50" },
                    { label: "Earned",           value: "₦36k", color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Available",        value: "₦36k", color: "text-purple-600", bg: "bg-purple-50" },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`${bg} rounded-2xl p-3`}>
                      <p className={`text-xl font-black ${color}`}>{value}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
                    </div>
                  ))}
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                  <div className="h-full w-3/4 rounded-full" style={{ background: "var(--accent)" }} />
                </div>
                <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>Balance · 3 referrals to next ₦5,000 milestone</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust signals ────────────────────────────────────────── */}
      <section className="py-16 px-4" style={{ background: "var(--accent)" }}>
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
          {[
            { icon: "🔒", title: "Secure payouts",     desc: "All payouts are manually reviewed and sent directly to your verified bank account." },
            { icon: "📊", title: "Transparent tracking", desc: "See every referral, status, and commission in real time on your dashboard." },
            { icon: "🇳🇬", title: "Built for Nigeria",  desc: "Designed for Nigerian affiliates. Payouts via local bank transfer — Opay, GTBank, and more." },
          ].map(({ icon, title, desc }) => (
            <div key={title}>
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-black text-black text-lg mb-2">{title}</h3>
              <p className="text-black/60 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <HelpCircle className="w-8 h-8 mx-auto mb-4" style={{ color: "var(--accent)" }} />
            <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: "var(--text-primary)" }}>Frequently asked questions</h2>
            <p style={{ color: "var(--text-secondary)" }}>Everything you need to know before you start.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="rounded-2xl border p-6" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                  <div>
                    <p className="font-bold mb-2" style={{ color: "var(--text-primary)" }}>{q}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 px-4 border-t" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <Image src="/logo.png" alt="Duka" width={100} height={40} className="h-10 w-auto object-contain mx-auto mb-8" />
          <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: "var(--text-primary)" }}>
            Ready to start earning?
          </h2>
          <p className="mb-8 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Join affiliates already earning by promoting Duka. Free to join, instant access, no approval needed.
          </p>
          <Link
            href="/affiliate/signup"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-black text-lg text-black transition-all hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            Create free affiliate account <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
            Already a member?{" "}
            <Link href="/affiliate/login" className="font-semibold hover:underline" style={{ color: "var(--accent-dark)" }}>
              Sign in →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="py-10 px-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex flex-col items-start gap-0.5">
            <Image src="/logo.png" alt="Duka" width={112} height={28} className="h-7 w-auto object-contain" />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>by Awarizon</span>
          </Link>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Duka by Awarizon. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/discover" className="text-xs hover:underline" style={{ color: "var(--text-secondary)" }}>Discover</Link>
            <Link href="/pricing" className="text-xs hover:underline" style={{ color: "var(--text-secondary)" }}>Pricing</Link>
            <Link href="/affiliate/signup" className="text-xs font-semibold hover:underline" style={{ color: "var(--accent-dark)" }}>Join affiliate</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
