import Link from "next/link";
import { ArrowRight, DollarSign, Users, Wallet, CheckCircle } from "lucide-react";

export const metadata = { title: "Affiliate Program — Duka by Awarizon" };

const HOW_IT_WORKS = [
  { step: "1", title: "Sign up free", desc: "Create your affiliate account in seconds. No cost, no approval needed." },
  { step: "2", title: "Share your link", desc: "Get a unique referral link and share it with entrepreneurs who want to sell online." },
  { step: "3", title: "Earn per activation", desc: "When your referred vendor pays their setup fee, you earn ₦1,000 instantly." },
];

const PERKS = [
  "₦1,000 per active referral",
  "Payout via bank transfer",
  "Real-time dashboard",
  "No cap on earnings",
  "Minimum payout: ₦5,000",
  "Lifetime tracking",
];

export default function AffiliateLandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center">
            <span className="text-black font-black text-sm">D</span>
          </div>
          <span className="font-black text-white">Duka Affiliates</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/affiliate/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Login
          </Link>
          <Link href="/affiliate/signup"
            className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-sm hover:bg-amber-300 transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold mb-6">
          <DollarSign className="w-3 h-3" /> Earn ₦1,000 per referral
        </div>
        <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-6">
          Refer vendors.<br />
          <span className="text-amber-400">Earn real money.</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-10">
          Join the Duka affiliate program. Share your link, get entrepreneurs to open their online store, and earn ₦1,000 for every vendor who activates.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/affiliate/signup"
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-amber-400 text-black font-black text-base hover:bg-amber-300 transition-all shadow-[0_0_30px_rgba(251,191,36,0.3)]">
            Start earning <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/affiliate/login"
            className="px-8 py-3.5 rounded-2xl border border-zinc-700 text-white font-semibold text-base hover:border-zinc-500 transition-colors">
            Sign in
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { value: "₦1,000", label: "Per active referral" },
            { value: "₦5,000", label: "Minimum payout" },
            { value: "∞", label: "No earnings cap" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
              <p className="text-2xl font-black text-amber-400">{value}</p>
              <p className="text-xs text-zinc-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-black text-center mb-12">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} className="relative p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center mb-4">
                <span className="font-black text-black">{step}</span>
              </div>
              <h3 className="font-bold text-white mb-2">{title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Perks */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-10">
          <div className="grid sm:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl font-black mb-4">Everything you need to earn</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Track your referrals in real time, see who signed up and who activated, and request payouts directly to your bank account.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PERKS.map((perk) => (
                  <div key={perk} className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    {perk}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl bg-zinc-800 border border-zinc-700 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">12 referrals</p>
                  <p className="text-zinc-400 text-xs">9 active · 3 pending</p>
                </div>
                <div className="ml-auto font-black text-amber-400">₦9,000</div>
              </div>
              <div className="rounded-2xl bg-zinc-800 border border-zinc-700 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-400/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Available balance</p>
                  <p className="text-zinc-400 text-xs">Ready to withdraw</p>
                </div>
                <div className="ml-auto font-black text-green-400">₦9,000</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-20 text-center">
        <h2 className="text-4xl font-black mb-4">Ready to start earning?</h2>
        <p className="text-zinc-400 mb-8">Free to join. No approval. Start referring today.</p>
        <Link href="/affiliate/signup"
          className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-amber-400 text-black font-black text-lg hover:bg-amber-300 transition-all">
          Create affiliate account <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      <footer className="border-t border-zinc-800 py-6 text-center text-zinc-600 text-xs">
        &copy; {new Date().getFullYear()} Awarizon. All rights reserved.
      </footer>
    </div>
  );
}
