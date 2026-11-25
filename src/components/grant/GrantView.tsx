import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, CalendarClock, Check, CheckCircle2, ClipboardCheck, GraduationCap, HandCoins, LineChart, Lock, Megaphone, Package, Sparkles, Trophy, Truck,
  type LucideIcon,
} from "lucide-react";
import HomeNav from "@/app/HomeNav";
import Footer from "@/components/Footer";
import { grantRequirements, grantTerms, roundAcceptsApplications, type GrantRound } from "@/lib/grants-shared";
import { GRANT_PHOTOS, type GrantPhoto, type GrantPhotoKey } from "@/lib/grant-photos";
import GrantCountdown from "./GrantCountdown";
import GrantApplyPanel from "./GrantApplyPanel";

// The Vendor Grant page. Real photos of Nigerian traders and makers (credited
// at the bottom) carry the story; icons are only small accents on them.

const SUPPORT: { photo: GrantPhotoKey; icon: LucideIcon; title: string; text: string }[] = [
  { photo: "market", icon: HandCoins, title: "Business grants", text: "Financial assistance to help merchants restock inventory, improve their operations, purchase business essentials or invest in other areas of growth." },
  { photo: "chat", icon: Megaphone, title: "Marketing guidance", text: "Practical strategies to improve brand visibility, attract customers and increase sales." },
  { photo: "fashion", icon: Package, title: "Branding and packaging", text: "Guidance and assistance with improving product presentation, packaging and overall brand identity." },
  { photo: "phones", icon: GraduationCap, title: "Business mentorship", text: "Follow-up sessions and guidance to help supported merchants make better business decisions." },
  { photo: "street", icon: Truck, title: "Logistics support", text: "Assistance in exploring suitable delivery and fulfilment solutions to help merchants serve their customers more efficiently." },
  { photo: "payment", icon: LineChart, title: "Digital business growth", text: "Guidance on making better use of Duka's tools to manage products, orders, customers and online sales." },
];

const FACTS = [
  { k: "Free", v: "to apply" },
  { k: "Monthly", v: "one business supported" },
  { k: "No sales", v: "minimum needed" },
  { k: "2 min", v: "application, no login" },
];

/** A photo that fills its box (the box sets the shape). */
function Photo({ p, sizes, className = "", priority = false }: { p: GrantPhoto; sizes: string; className?: string; priority?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-zinc-200 dark:bg-zinc-800 ${className}`}>
      <Image src={p.src} alt={p.alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}

const USED: GrantPhotoKey[] = ["fashion", "trader", "shoes", "market", "chat", "phones", "street", "payment"];

export default function GrantView({ round }: { round: GrantRound | null }) {
  const open = roundAcceptsApplications(round);
  const minProducts = round?.min_products ?? 30;
  const terms = grantTerms(minProducts);
  const requirements = grantRequirements(minProducts);
  const muted = { color: "var(--text-secondary)" };
  const ink = { color: "var(--text-primary)" };
  const P = GRANT_PHOTOS;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <HomeNav />

      {/* ═════════════ HERO ═════════════ */}
      <section className="relative overflow-hidden bg-[#05090a] px-4 pb-16 pt-28 text-white sm:pb-24 sm:pt-36">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-40 left-[-10%] h-[520px] w-[760px] rounded-full bg-amber-500 opacity-25 blur-[120px]" />
          <div className="absolute -bottom-48 right-[-10%] h-[460px] w-[560px] rounded-full bg-orange-600 opacity-20 blur-[120px]" />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold ring-1 ring-white/15">
              <span className={`h-2 w-2 rounded-full ${open ? "animate-pulse bg-emerald-400" : "bg-white/50"}`} />
              {open ? "Applications open now" : "Duka Vendor Grant & Support Fund"}
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl">
              Supporting the people <span className="bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">behind the businesses.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
              Every business deserves an opportunity to grow. Duka supports ambitious entrepreneurs with funding, guidance and practical resources to take their business to the next level.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#apply" className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-6 text-[15px] font-bold text-black shadow-[0_12px_32px_-12px_rgba(251,191,36,0.8)] transition hover:bg-amber-300">
                {open ? "Apply now" : "See how to apply"} <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#terms" className="inline-flex h-12 items-center rounded-xl px-5 text-[15px] font-semibold text-white ring-1 ring-white/25 hover:bg-white/10">
                Terms &amp; conditions
              </a>
            </div>
          </div>

          {/* Photo collage with this round's card on top */}
          <div className="relative">
            <div className="grid h-[420px] grid-cols-[1.25fr_1fr] grid-rows-2 gap-3 sm:h-[500px]">
              <Photo p={P.fashion} priority sizes="(min-width: 1024px) 340px, 60vw" className="row-span-2 rounded-[1.75rem] ring-1 ring-white/10" />
              <Photo p={P.trader} priority sizes="(min-width: 1024px) 260px, 40vw" className="rounded-[1.75rem] ring-1 ring-white/10" />
              <Photo p={P.shoes} sizes="(min-width: 1024px) 260px, 40vw" className="rounded-[1.75rem] ring-1 ring-white/10" />
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-gradient-to-t from-[#05090a]/70 via-transparent to-transparent" aria-hidden />

            <div className="relative -mt-24 mx-3 rounded-[1.5rem] bg-zinc-950/80 p-5 ring-1 ring-white/15 backdrop-blur-xl sm:absolute sm:-bottom-8 sm:-left-8 sm:mx-0 sm:mt-0 sm:w-[340px]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white/70">{round?.title ?? "Monthly grant round"}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${open ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30" : "bg-white/10 text-white/70 ring-1 ring-white/15"}`}>
                  {open ? "Open" : "Closed"}
                </span>
              </div>
              <p className="mt-2 text-xl font-black tracking-tight">Monthly business support</p>
              <div className="mt-4 border-t border-white/10 pt-4">
                {open && round?.closes_at ? (
                  <>
                    <p className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                      <CalendarClock className="h-3.5 w-3.5" /> Applications close in
                    </p>
                    <GrantCountdown closesAt={round.closes_at} />
                  </>
                ) : (
                  <p className="text-sm text-white/70">{open ? "Applications are open now. Apply before the round closes." : "The next round opens soon. Get your store ready: see the requirements below."}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick facts */}
        <dl className="relative mx-auto mt-20 grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10 sm:mt-24 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.k} className="bg-[#05090a]/80 px-5 py-5">
              <dt className="text-2xl font-black tracking-tight text-amber-300">{f.k}</dt>
              <dd className="mt-0.5 text-sm text-white/65">{f.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ═════════════ INTRO ═════════════ */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative">
            <Photo p={P.market} sizes="(min-width: 1024px) 560px, 100vw" className="aspect-[4/3] rounded-[2rem]" />
            <div className="absolute -bottom-5 right-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-black">
                <HandCoins className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-bold" style={ink}>Funding + guidance</span>
                <span className="block text-xs" style={muted}>for real, growing businesses</span>
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Why a grant fund</p>
            <p className="mt-4 text-2xl font-bold leading-snug tracking-tight sm:text-3xl" style={ink}>
              Building a successful business takes more than a great product. It takes resources, the right tools, guidance, visibility and sometimes a little support at the right time.
            </p>
            <p className="mt-6 text-lg leading-relaxed" style={muted}>
              That&apos;s why we&apos;re introducing the Duka Vendor Grant &amp; Support Fund: an initiative to support ambitious entrepreneurs and small business owners who are committed to building and growing their businesses.
            </p>
          </div>
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORT.map((s) => (
              <article key={s.title} className="group overflow-hidden rounded-[1.75rem] border transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_-32px_rgba(0,0,0,0.45)]" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image src={P[s.photo].src} alt={P[s.photo].alt} fill sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-black shadow-lg">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <h3 className="absolute bottom-4 left-[4.5rem] right-4 text-lg font-bold leading-tight text-white">{s.title}</h3>
                </div>
                <p className="p-5 text-[15px] leading-relaxed" style={muted}>{s.text}</p>
              </article>
            ))}
          </div>
          <p className="mt-10 text-center text-[15px] font-medium" style={muted}>Our goal is to understand what each business needs and help where we can.</p>
        </div>
      </section>

      {/* ═════════════ HOW IT WORKS ═════════════ */}
      <section className="relative overflow-hidden px-4 py-20 sm:py-28" style={{ background: "var(--bg-secondary)" }}>
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">How the fund works</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl" style={ink}>A business supported every month</h2>
          </div>
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-6">
            <span className="absolute left-[16%] right-[16%] top-8 hidden h-[3px] rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 md:block" aria-hidden />
            {[
              { icon: ClipboardCheck, t: "Apply", d: "Submit an application for the round and confirm it from your email. No login needed." },
              { icon: BadgeCheck, t: "We review", d: "We check your store setup and look at your business, readiness and how the support could help." },
              { icon: Trophy, t: "One business is selected", d: "The selected business receives support for the month, plus guidance and follow-up from the Duka team." },
            ].map((s, i) => (
              <li key={s.t} className="relative text-center">
                <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-black shadow-[0_12px_30px_-10px_rgba(245,158,11,0.8)] ring-8 [--tw-ring-color:var(--bg-secondary)]">
                  <s.icon className="h-7 w-7" />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-[11px] font-black text-white dark:bg-white dark:text-zinc-950">{i + 1}</span>
                </span>
                <h3 className="mt-5 text-xl font-bold" style={ink}>{s.t}</h3>
                <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed" style={muted}>{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ═════════════ WHO + APPLY ═════════════ */}
      <section id="apply" className="scroll-mt-20 px-4 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Who can apply?</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl" style={ink}>For serious entrepreneurs growing on Duka</h2>
            <p className="mt-4 text-lg leading-relaxed" style={muted}>
              Entrepreneurs, small business owners and merchants who are intentional about growing: a genuine business, an active Duka storefront and a clear idea of how the support could help them move forward.
            </p>

            {/* Photo banner: sales aren't a criterion */}
            <div className="relative mt-8 overflow-hidden rounded-[1.75rem]">
              <Photo p={P.shoes} sizes="(min-width: 1024px) 540px, 100vw" className="aspect-[16/8]" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
              <div className="absolute inset-y-0 left-0 flex max-w-[75%] flex-col justify-center p-6 text-white">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <Sparkles className="h-4 w-4" /> Good to know
                </p>
                <p className="mt-2 text-xl font-black leading-tight sm:text-2xl">Sales are not a criterion.</p>
                <p className="mt-1.5 text-sm text-white/80">New and growing stores are just as welcome. Your store just needs to be properly set up.</p>
              </div>
            </div>

            <p className="mt-8 text-sm font-bold uppercase tracking-wider" style={ink}>Your store must have</p>
            <ul className="mt-4 space-y-3">
              {requirements.map((x) => (
                <li key={x.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span>
                    <span className="block text-[15px] font-bold leading-tight" style={ink}>{x.title}</span>
                    <span className="mt-0.5 block text-[13.5px] leading-snug" style={muted}>{x.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
              We check your setup automatically when you apply, and again when you confirm your email. Don&apos;t have a store yet?{" "}
              <Link href="/auth/signup" className="font-semibold text-amber-700 underline underline-offset-2 dark:text-amber-400">Create your free Duka store</Link> and get it ready for the next round.
            </p>
          </div>

          <div className="relative lg:sticky lg:top-24 lg:self-start">
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-amber-300/40 via-orange-300/20 to-transparent blur-2xl dark:from-amber-500/20" aria-hidden />
            <div className="relative overflow-hidden rounded-[1.75rem] border shadow-xl" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
              {/* A strip of faces at the top of the form */}
              <div className="relative h-28 overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-3">
                  <Photo p={P.trader} sizes="200px" className="h-full" />
                  <Photo p={P.fashion} sizes="200px" className="h-full" />
                  <Photo p={P.phones} sizes="200px" className="h-full" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-black/20 to-black/10" />
              </div>
              <div className="-mt-6 p-6 pt-0 sm:p-8 sm:pt-0">
                <div className="relative mb-6 flex items-start justify-between gap-3">
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
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Why we&apos;re doing this</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl" style={ink}>Our role goes beyond technology</h2>
            <div className="mt-5 space-y-4 text-lg leading-relaxed" style={muted}>
              <p>Duka was created to make it easier for businesses to establish an online presence, manage their stores and reach more customers.</p>
              <p>We want to see the businesses on our platform grow: to support entrepreneurs who are putting in the work, help them overcome practical challenges and create opportunities for them to reach more customers.</p>
              <p>As the Duka community grows, we hope to support more businesses and build lasting relationships with the merchants who make that community what it is.</p>
            </div>
          </div>
          <div className="relative order-1 lg:order-2">
            <Photo p={P.trader} sizes="(min-width: 1024px) 560px, 100vw" className="aspect-[5/4] rounded-[2rem] shadow-2xl" />
            <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
              <span className="relative block h-10 w-10 overflow-hidden rounded-full ring-2 ring-amber-400">
                <Image src={P.phones.src} alt="" fill sizes="40px" className="object-cover" />
              </span>
              <span>
                <span className="block text-sm font-bold" style={ink}>Built for Nigerian businesses</span>
                <span className="block text-xs" style={muted}>from market stalls to online stores</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ FINAL CTA (photo background) ═════════════ */}
      <section className="relative overflow-hidden px-4 py-24 text-center text-white sm:py-32">
        <Image src={P.street.src} alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-black/90" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-amber-500 opacity-20 blur-[120px]" aria-hidden />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Your business deserves room to grow.</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/75">
            Whether you&apos;re looking to restock, improve your packaging, reach more customers or take the next step in building your brand, this is an opportunity to move forward with support.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#apply" className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-6 text-[15px] font-bold text-black hover:bg-amber-300">
              {open ? "Apply now" : "See how to apply"} <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/auth/signup" className="inline-flex h-12 items-center rounded-xl bg-white/10 px-6 text-[15px] font-semibold ring-1 ring-white/25 backdrop-blur hover:bg-white/20">
              Create a free store
            </Link>
          </div>
          <p className="mt-10 flex items-center justify-center gap-2 text-sm text-white/60">
            <CheckCircle2 className="h-4 w-4 text-amber-400" /> Build your store. Grow your business. Let Duka be part of your journey.
          </p>
        </div>
      </section>

      {/* ═════════════ PHOTO CREDITS ═════════════ */}
      <section className="px-4 py-8" style={{ background: "var(--bg-secondary)" }}>
        <div className="mx-auto max-w-6xl">
          <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Photo credits</p>
          <ul className="mt-2 grid gap-x-6 gap-y-1 text-[12px] leading-relaxed sm:grid-cols-2" style={{ color: "var(--text-muted)" }}>
            {USED.map((k) => {
              const p = P[k];
              return (
                <li key={k}>
                  {p.alt}: photo by{" "}
                  <a href={p.page} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-amber-600">{p.author}</a>,{" "}
                  <a href={p.licence.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-amber-600">{p.licence.name}</a>, via Wikimedia Commons (cropped).
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}
