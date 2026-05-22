import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, CheckCircle2, DollarSign, Users, Wallet,
  BarChart3, Link2, ShieldCheck, Clock, HelpCircle,
} from "lucide-react";

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
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="Duka" width={80} height={32} className="h-8 w-auto object-contain" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:block">Affiliates</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-500">
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#earnings"     className="hover:text-gray-900 transition-colors">Earnings</a>
            <a href="#faq"          className="hover:text-gray-900 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/affiliate/login"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link href="/affiliate/signup"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 text-black font-bold text-sm hover:bg-amber-300 transition-all shadow-sm whitespace-nowrap">
              Join free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 to-white py-20 sm:py-28 px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(ellipse, #fbbf24 0%, transparent 70%)" }} />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold mb-6">
                <DollarSign className="w-3 h-3" /> Earn ₦2,000 per referral — no cap
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-6 text-gray-900">
                Turn your network into
                <br className="hidden sm:block" />
                <span className="text-amber-500"> real income.</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Join the Duka Affiliate Program. Share your unique link, invite vendors to sell on Duka,
                and earn ₦2,000 every time one activates — with no limit on how much you can make.
              </p>

              {/* Social proof avatars */}
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-8">
                <div className="flex -space-x-2">
                  {[
                    "photo-1494790108377-be9c29b29330",
                    "photo-1507003211169-0a1dd7228f2d",
                    "photo-1438761681033-6461ffad8d80",
                    "photo-1472099645785-5658abf4ff4e",
                  ].map((id) => (
                    <img
                      key={id}
                      src={`https://images.unsplash.com/${id}?w=40&h=40&fit=crop&q=80`}
                      alt=""
                      className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-sm"
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  <span className="font-bold text-gray-700">200+</span> affiliates already earning
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <Link href="/affiliate/signup"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-amber-400 text-black font-black text-base hover:bg-amber-300 transition-all shadow-[0_4px_24px_rgba(251,191,36,0.35)] hover:shadow-[0_6px_32px_rgba(251,191,36,0.45)]">
                  Start earning free <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/affiliate/login"
                  className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-base hover:border-gray-400 transition-colors">
                  I have an account
                </Link>
              </div>
              <p className="text-xs text-gray-400 mt-5 text-center lg:text-left">Free to join · No approval needed · Instant link</p>
            </div>

            {/* Right: photo with floating widgets */}
            <div className="hidden lg:block relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=620&h=520&fit=crop&q=80"
                  alt="Affiliate earning on Duka"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/15 to-transparent pointer-events-none" />
              </div>

              {/* Floating earnings card */}
              <div className="absolute bottom-8 left-6 bg-white rounded-2xl shadow-2xl p-4 min-w-[160px] border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Your balance</p>
                <p className="text-2xl font-black text-amber-500">₦18,000</p>
                <p className="text-xs text-gray-500 mt-0.5">9 active referrals</p>
              </div>

              {/* Floating notification */}
              <div className="absolute top-8 right-6 bg-white rounded-2xl shadow-2xl p-3.5 flex items-center gap-3 border border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <span className="text-green-600 font-black text-base">✓</span>
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">+₦2,000</p>
                  <p className="text-[10px] text-gray-500">New referral paid!</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-white py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center">
          {[
            { value: "₦2,000",  label: "Per active referral" },
            { value: "₦5,000",  label: "Minimum payout" },
            { value: "0%",      label: "Platform fee on earnings" },
            { value: "∞",       label: "Maximum you can earn" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl sm:text-4xl font-black text-amber-500 mb-1">{value}</p>
              <p className="text-xs sm:text-sm text-gray-400 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">Simple process</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">How it works</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Three steps stand between you and your first commission.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
            {STEPS.map(({ step, icon: Icon, title, desc }) => (
              <div key={step}
                className="relative bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-shadow">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-black" />
                  </div>
                  <span className="text-3xl font-black text-gray-100">{step}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial banner ───────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1400&h=320&fit=crop&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gray-900/78" />
        <div className="relative py-16 px-4 text-center">
          <blockquote className="max-w-3xl mx-auto">
            <p className="text-white text-xl sm:text-2xl font-bold italic leading-relaxed mb-6">
              &ldquo;I referred 12 vendors in my first month just by posting in my WhatsApp groups.
              Earned ₦24,000 without doing anything complicated.&rdquo;
            </p>
            <div className="flex items-center justify-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=48&h=48&fit=crop&q=80"
                alt="Adaeze"
                className="w-11 h-11 rounded-full object-cover border-2 border-amber-400"
              />
              <cite className="not-italic text-left">
                <span className="block text-white font-bold text-sm">Adaeze O.</span>
                <span className="text-white/50 text-xs">Affiliate — Lagos, Nigeria</span>
              </cite>
            </div>
          </blockquote>
        </div>
      </section>

      {/* ── Earnings showcase ────────────────────────────────────── */}
      <section id="earnings" className="py-20 sm:py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">Your earnings</p>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-5">
                The more you share,<br />the more you earn.
              </h2>
              <p className="text-gray-500 leading-relaxed mb-8">
                There&apos;s no limit on referrals or earnings. Every vendor you bring to Duka who activates their store puts ₦2,000 straight into your affiliate balance. Reach ₦5,000 and you can cash out to any Nigerian bank account.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PERKS.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Earnings calculator preview */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-3xl border border-gray-100 p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Earnings example</p>
                <div className="space-y-3">
                  {[
                    { referrals: 5,   earning: "₦10,000" },
                    { referrals: 10,  earning: "₦20,000" },
                    { referrals: 25,  earning: "₦50,000" },
                    { referrals: 50,  earning: "₦100,000" },
                    { referrals: 100, earning: "₦200,000" },
                  ].map(({ referrals, earning }) => (
                    <div key={referrals}
                      className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                          <Users className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">
                          {referrals} active vendor{referrals !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="text-base font-black text-amber-500">{earning}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4 text-center">Based on ₦2,000 per active referral</p>
              </div>

              {/* Dashboard preview card */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-gray-900">Your dashboard</p>
                  <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Live preview</span>
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
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-amber-400 rounded-full" />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Balance · 3 referrals to next ₦5,000 milestone</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust signals ────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-amber-400">
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
      <section id="faq" className="py-20 sm:py-24 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <HelpCircle className="w-8 h-8 text-amber-400 mx-auto mb-4" />
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Frequently asked questions</h2>
            <p className="text-gray-500">Everything you need to know before you start.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="rounded-2xl border border-gray-100 p-6 bg-gray-50">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900 mb-2">{q}</p>
                    <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 px-4 bg-gray-50 border-t border-gray-100">
        <div className="max-w-2xl mx-auto text-center">
          <Image src="/logo.png" alt="Duka" width={100} height={40} className="h-10 w-auto object-contain mx-auto mb-8" />
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
            Ready to start earning?
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Join hundreds of affiliates already earning by promoting Duka. Free to join, instant access, no approval needed.
          </p>
          <Link href="/affiliate/signup"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-amber-400 text-black font-black text-lg hover:bg-amber-300 transition-all shadow-[0_4px_24px_rgba(251,191,36,0.35)]">
            Create free affiliate account <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-gray-400 mt-4">Already a member? <Link href="/affiliate/login" className="text-amber-600 font-semibold hover:underline">Sign in →</Link></p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Duka" width={64} height={24} className="h-6 w-auto object-contain" />
            <span className="text-xs text-gray-400">by Awarizon</span>
          </Link>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} Awarizon. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/" className="hover:text-gray-700 transition-colors">Home</Link>
            <Link href="/discover" className="hover:text-gray-700 transition-colors">Discover stores</Link>
            <Link href="/affiliate/signup" className="hover:text-gray-700 transition-colors font-semibold text-amber-600">Join affiliate</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
