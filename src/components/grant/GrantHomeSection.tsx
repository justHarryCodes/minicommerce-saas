import Link from "next/link";
import { ArrowRight, GraduationCap, HandCoins, Megaphone, Package, Sparkles } from "lucide-react";
import { roundAcceptsApplications, type GrantRound } from "@/lib/grants-shared";
import GrantCountdown from "./GrantCountdown";

/** Homepage band: the Duka Vendor Grant & Support Fund, with the live round. */
export default function GrantHomeSection({ round }: { round: GrantRound | null }) {
  const open = roundAcceptsApplications(round);
  return (
    <section className="px-4 py-20 sm:py-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#05090a] text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-20 -top-32 h-[380px] w-[520px] rounded-full bg-amber-500 opacity-30 blur-[110px]" />
          <div className="absolute -bottom-32 right-0 h-[320px] w-[460px] rounded-full bg-orange-600 opacity-25 blur-[110px]" />
          <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
        </div>
        <div className="relative grid gap-10 p-7 sm:p-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold ring-1 ring-white/15">
              <Sparkles className="h-4 w-4 text-amber-400" /> New · Duka Vendor Grant &amp; Support Fund
            </span>
            <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              Grow your business <span className="text-amber-400">with Duka&apos;s support.</span>
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
              Every month, one ambitious merchant receives business support from Duka, plus guidance on marketing, branding, packaging and logistics. Sales aren&apos;t a criterion: a properly set-up store is.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { icon: HandCoins, t: "Business grant" },
                { icon: Megaphone, t: "Marketing" },
                { icon: Package, t: "Packaging" },
                { icon: GraduationCap, t: "Mentorship" },
              ].map((x) => (
                <span key={x.t} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-sm text-white/80 ring-1 ring-white/10">
                  <x.icon className="h-4 w-4 text-amber-400" /> {x.t}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/grant#apply" className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-6 text-[15px] font-bold text-black transition hover:bg-amber-300">
                {open ? "Apply now" : "Learn how to apply"} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/grant" className="inline-flex h-12 items-center rounded-xl px-5 text-[15px] font-semibold ring-1 ring-white/25 hover:bg-white/10">
                About the fund
              </Link>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white/[0.06] p-6 ring-1 ring-white/15 backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white/70">{round?.title ?? "Monthly round"}</p>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${open ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30" : "bg-white/10 text-white/70 ring-1 ring-white/15"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${open ? "animate-pulse bg-emerald-400" : "bg-white/50"}`} /> {open ? "Open" : "Opening soon"}
              </span>
            </div>
            <p className="mt-4 text-3xl font-black leading-tight tracking-tight">Monthly business support</p>
            <p className="mt-1 text-sm text-white/60">for one selected business</p>
            <div className="mt-6 border-t border-white/10 pt-5">
              {open && round?.closes_at ? (
                <>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">Applications close in</p>
                  <GrantCountdown closesAt={round.closes_at} size="sm" />
                </>
              ) : (
                <p className="text-sm text-white/70">You&apos;ll need a properly set-up store: {round?.min_products ?? 30} different products, a logo and your details filled in.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
