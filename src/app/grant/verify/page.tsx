import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import HomeNav from "@/app/HomeNav";
import Footer from "@/components/Footer";
import { naira, verifyGrantApplication } from "@/lib/grants";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirm your application · Duka Vendor Grant", robots: { index: false } };

// The link from the confirmation email lands here.
export default async function GrantVerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const r = await verifyGrantApplication(token ?? "").catch(() => ({ ok: false as const, error: "Something went wrong. Please try the link again in a minute." }));
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <HomeNav />
      <main className="flex min-h-[70vh] items-center justify-center px-4 pb-16 pt-28">
        <div className="w-full max-w-md rounded-[1.75rem] border p-8 text-center shadow-xl" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
          {r.ok ? (
            <>
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <h1 className="mt-5 text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                {r.already ? "You're already in" : "Application submitted 🎉"}
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                <strong>{r.storeName}</strong> is in the running for the <strong>{r.round.title}</strong> round ({naira(r.round.amount)}). We review every application and contact the selected business by email.
              </p>
              <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>Keep your store active and your products up to date in the meantime.</p>
            </>
          ) : (
            <>
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                <XCircle className="h-8 w-8" />
              </span>
              <h1 className="mt-5 text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>We couldn&apos;t confirm this</h1>
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{r.error}</p>
            </>
          )}
          <Link href="/grant" className="mt-7 inline-flex h-11 items-center rounded-xl bg-amber-400 px-5 text-sm font-bold text-black hover:bg-amber-500">
            Back to the Vendor Grant
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
