import Link from "next/link";
import {
  ArrowRight, BadgeCheck, CalendarClock, CheckCircle2, ClipboardCheck, GraduationCap, HandCoins, HeartHandshake, LineChart, Lock, Mail, Megaphone, Package, Sparkles, Store, Trophy, Truck,
} from "lucide-react";
import HomeNav from "@/app/HomeNav";
import Footer from "@/components/Footer";
import { grantRequirements, grantTerms, roundAcceptsApplications, type GrantRound } from "@/lib/grants-shared";
import GrantCountdown from "./GrantCountdown";
import GrantApplyPanel from "./GrantApplyPanel";

const SUPPORT = [
  { icon: HandCoins, title: "Business grants", text: "Financial assistance to help merchants restock inventory, improve their operations, purchase business essentials or invest in other areas of growth.", tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  { icon: Megaphone, title: "Marketing guidance", text: "Practical strategies to improve brand visibility, attract customers and increase sales.", tone: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300" },
  { icon: Package, title: "Branding and packaging", text: "Guidance and assistance with improving product presentation, packaging and overall brand identity.", tone: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  { icon: GraduationCap, title: "Business mentorship", text: "Follow-up sessions and guidance to help supported merchants make better business decisions.", tone: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  { icon: Truck, title: "Logistics support", text: "Assistance in exploring suitable delivery and fulfilment solutions to help merchants serve their customers more efficiently.", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  { icon: LineChart, title: "Digital business growth", text: "Guidance on making better use of Duka's tools to manage products, orders, customers and online sales.", tone: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" },
];

export default function GrantView({ round }: { round: GrantRound | null }) {
  const open = roundAcceptsApplications(round);
  const minProducts = round?.min_products ?? 30;
  const terms = grantTerms(minProducts);
  const requirements = grantRequirements(minProducts);
  const muted = { color: "var(--text-secondary)" };
  const ink = { color: "var(--text-primary)" };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <HomeNav />

      {/* ═════════════ HERO ═════════════ */}
      <section className="relative overflow-hidden bg-[#05090a] px-4 pb-20 pt-28 text-white sm:pb-28 sm:pt-36">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-amber-500 opacity-25 blur-[120px]" />
          <div className="absolute -bottom-40 right-[-10%] h-[420px] w-[520px] rounded-full bg-orange-600 opacity-20 blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold ring-1 ring-white/15">
              <Sparkles className="h-4 w-4 text-amber-400" /> Duka Vendor Grant &amp; Support Fund
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Supporting the people <span className="bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">behind the businesses.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
              Every business deserves an opportunity to grow. Duka supports ambitious entrepreneurs with funding, guidance and practical resources to take their business to the next level.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#apply" className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-6 text-[15px] font-bold text-black transition hover:bg-amber-300">
                {open ? "Apply now" : "See how to apply"} <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#terms" className="inline-flex h-12 items-center rounded-xl px-5 text-[15px] font-semibold text-white ring-1 ring-white/25 hover:bg-white/10">
                Terms &amp; conditions
              </a>
            </div>
          </div>

          {/* This round */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-amber-400/30 to-orange-600/10 blur-2xl" aria-hidden />
            <div className="relative rounded-[1.75rem] bg-white/[0.06] p-6 ring-1 ring-white/15 backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white/70">{round?.title ?? "Monthly grant round"}</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${open ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30" : "bg-white/10 text-white/70 ring-1 ring-white/15"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${open ? "animate-pulse bg-emerald-400" : "bg-white/50"}`} /> {open ? "Applications open" : "Applications closed"}
                </span>
              </div>
              <p className="mt-6 text-3xl font-black leading-tight tracking-tight sm:text-4xl">Monthly business support</p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/65">One selected merchant every month, plus guidance and follow-up support from the Duka team.</p>
              <ul className="mt-5 space-y-2 text-sm text-white/80">
                {["Business grant", "Marketing & branding guidance", "Mentorship & follow-up"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400" /> {t}</li>
                ))}
              </ul>
              <div className="mt-6 border-t border-white/10 pt-6">
                {open && round?.closes_at ? (
                  <>
                    <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60">
                      <CalendarClock className="h-4 w-4" /> Applications close in
                    </p>
                    <GrantCountdown closesAt={round.closes_at} />
                  </>
                ) : open ? (
                  <p className="text-sm text-white/70">Applications are open now. Apply before the round closes.</p>
                ) : (
                  <p className="text-sm text-white/70">The next round opens soon. Get your store ready: see the requirements below.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ INTRO ═════════════ */}
      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xl leading-relaxed sm:text-2xl" style={ink}>
            Building a successful business takes more than having a great product. It takes <strong>resources</strong>, the <strong>right tools</strong>, <strong>guidance</strong>, <strong>visibility</strong> and sometimes a little <strong>support at the right time</strong>.
          </p>
          <p className="mt-6 text-lg leading-relaxed" style={muted}>
            That&apos;s why we&apos;re introducing the Duka Vendor Grant &amp; Support Fund: an initiative to support ambitious entrepreneurs and small business owners who are committed to building and growing their businesses.
          </p>
        </div>
      </section>

      {/* ═════════════ SUPPORT ═════════════ */}
      <section className="px-4 pb-20 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">More than financial support</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl" style={ink}>We want to be part of your growth journey</h2>
            <p className="mt-3 text-lg" style={muted}>Depending on each merchant&apos;s needs, our support may include:</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORT.map((s) => (
              <div key={s.title} className="group rounded-3xl border p-6 transition hover:-translate-y-1 hover:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.35)]" style={{ borderColor: "var(--border)", background: "var(--card, var(--bg))" }}>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.tone}`}>
                  <s.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold" style={ink}>{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed" style={muted}>{s.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-[15px] font-medium" style={muted}>Our goal is to understand what each business needs and help where we can.</p>
        </div>
      </section>

      {/* ═════════════ HOW IT WORKS ═════════════ */}
      <section className="px-4 py-20 sm:py-24" style={{ background: "var(--bg-secondary)" }}>
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">How the fund works</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl" style={ink}>A business supported every month</h2>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {[
              { icon: ClipboardCheck, t: "Apply", d: "Interested merchants submit an application for each funding round and confirm it by email." },
              { icon: BadgeCheck, t: "We review", d: "Applications are reviewed on the programme's eligibility, business readiness and the potential impact of the support." },
              { icon: Trophy, t: "One business is selected", d: "The selected business receives business support for the month, plus guidance and follow-up from the Duka team." },
            ].map((s, i) => (
              <li key={s.t} className="relative rounded-3xl border p-6" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <span className="absolute right-6 top-5 text-5xl font-black text-amber-400/25">{i + 1}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold" style={ink}>{s.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed" style={muted}>{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ═════════════ WHO + APPLY ═════════════ */}
      <section id="apply" className="scroll-mt-20 px-4 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Who can apply?</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl" style={ink}>For serious entrepreneurs growing on Duka</h2>
            <p className="mt-4 text-lg leading-relaxed" style={muted}>
              The programme is for entrepreneurs, small business owners and merchants who are intentional about growing their businesses: with a genuine business, an active Duka storefront and a clear idea of how the support could help them move forward.
            </p>
            <p className="mt-8 text-sm font-bold uppercase tracking-wider" style={ink}>Your store must be properly set up</p>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {requirements.map((x, i) => {
                const Icon = [Package, BadgeCheck, Store, HeartHandshake, HandCoins, Mail][i] ?? CheckCircle2;
                return (
                  <li key={x.title} className="flex gap-3 rounded-2xl border p-3.5" style={{ borderColor: "var(--border)" }}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span>
                      <span className="block text-[15px] font-bold leading-tight" style={ink}>{x.title}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug" style={muted}>{x.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span><strong>Sales are not a criterion.</strong> New and growing stores are just as welcome. We check your setup automatically when you apply, and again when you confirm your email.</span>
            </div>
            <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
              Don&apos;t have a store yet?{" "}
              <Link href="/auth/signup" className="font-semibold text-amber-700 underline underline-offset-2 dark:text-amber-400">Create your free Duka store</Link> and get it ready for the next round.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-amber-300/40 via-orange-300/20 to-transparent blur-2xl dark:from-amber-500/20" aria-hidden />
            <div className="relative rounded-[1.75rem] border p-6 shadow-xl sm:p-8" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-black tracking-tight" style={ink}>Apply for {round?.title ?? "the grant"}</h3>
                  <p className="mt-1 text-sm" style={muted}>Takes about 2 minutes. No login needed.</p>
                </div>
                {open && round?.closes_at && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                    Closes {new Date(round.closes_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" })}
                  </span>
                )}
              </div>
              {open ? (
                <GrantApplyPanel minProducts={minProducts} amount={round!.amount} title={round!.title} />
              ) : (
                <div className="rounded-2xl p-8 text-center" style={{ background: "var(--bg-secondary)" }}>
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <Lock className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-lg font-bold" style={ink}>Applications are closed</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm" style={muted}>
                    The next round will open soon. In the meantime, make sure your store meets the requirements: {minProducts} different products, logo, description, contact number and payment details.
                  </p>
                  <Link href="/auth/login" className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white dark:bg-white dark:text-zinc-900">
                    Go to my store <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ TERMS ═════════════ */}
      <section id="terms" className="scroll-mt-20 px-4 pb-20 sm:pb-28">
        <div className="mx-auto max-w-3xl rounded-[1.75rem] border p-6 sm:p-10" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          <h2 className="text-2xl font-black tracking-tight" style={ink}>Terms and conditions</h2>
          <p className="mt-2 text-sm" style={muted}>By applying, you agree to the following. Specific requirements, deadlines and selection criteria are published for each round.</p>
          <ol className="mt-6 space-y-4">
            {terms.map((t, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed" style={muted}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-black">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ═════════════ WHY ═════════════ */}
      <section className="px-4 pb-20 sm:pb-28">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Why we&apos;re doing this</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl" style={ink}>Our role goes beyond technology</h2>
          </div>
          <div className="space-y-4 text-lg leading-relaxed" style={muted}>
            <p>Duka was created to make it easier for businesses to establish an online presence, manage their stores and reach more customers.</p>
            <p>We want to see the businesses on our platform grow: to support entrepreneurs who are putting in the work, help them overcome practical challenges and create opportunities for them to reach more customers.</p>
            <p>As the Duka community grows, we hope to support more businesses and build lasting relationships with the merchants who make that community what it is.</p>
          </div>
        </div>
      </section>

      {/* ═════════════ FINAL CTA ═════════════ */}
      <section className="relative overflow-hidden bg-[#05090a] px-4 py-24 text-center text-white sm:py-28">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-amber-500 opacity-20 blur-[120px]" aria-hidden />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Your business deserves room to grow.</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
            Whether you&apos;re looking to restock, improve your packaging, reach more customers or take the next step in building your brand, this is an opportunity to move forward with support.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#apply" className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-6 text-[15px] font-bold text-black hover:bg-amber-300">
              {open ? "Apply now" : "See how to apply"} <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/auth/signup" className="inline-flex h-12 items-center rounded-xl px-6 text-[15px] font-semibold ring-1 ring-white/25 hover:bg-white/10">
              Create a free store
            </Link>
          </div>
          <p className="mt-10 flex items-center justify-center gap-2 text-sm text-white/50">
            <CheckCircle2 className="h-4 w-4 text-amber-400" /> Build your store. Grow your business. Let Duka be part of your journey.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
