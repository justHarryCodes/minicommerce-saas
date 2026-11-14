import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Loader, XCircle } from "lucide-react";
import { DELETION_DAYS, getDeletionRequest, normaliseCode } from "@/lib/data-deletion";
import DeletionForm from "./DeletionForm";
import DukaLogo from "@/components/DukaLogo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Delete your data",
  description: "How to delete your Duka account and data, or ask us to delete data a Duka store holds about you.",
  alternates: { canonical: "/data-deletion" },
};

const STATUS = {
  received: { icon: Clock, label: "Received", text: "We have your request and will confirm it's you before deleting.", tone: "text-amber-600" },
  in_progress: { icon: Loader, label: "In progress", text: "We're deleting your data now.", tone: "text-blue-600" },
  completed: { icon: CheckCircle2, label: "Completed", text: "Your data has been deleted.", tone: "text-green-600" },
  rejected: { icon: XCircle, label: "Closed", text: "We couldn't confirm this request. Email support@dukanigeria.com with your code.", tone: "text-red-600" },
} as const;

const fmt = (d: string | Date) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });

function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return <h2 id={id} className="text-xl font-bold text-zinc-900 dark:text-white mt-10 mb-3 scroll-mt-24">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">{children}</p>;
}

async function StatusCard({ raw }: { raw: string }) {
  const code = normaliseCode(raw);
  const req = code ? await getDeletionRequest(code).catch(() => null) : null;
  if (!req) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-8">
        <p className="font-semibold text-zinc-900 dark:text-white">We couldn&apos;t find that code</p>
        <p className="text-sm text-zinc-500 mt-1">Check it matches the one in your email (it looks like DEL-AB12CD34), or email support@dukanigeria.com.</p>
      </div>
    );
  }
  const s = STATUS[req.status] ?? STATUS.received;
  const Icon = s.icon;
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Request {req.code}</p>
      <p className={`mt-2 flex items-center gap-2 text-lg font-bold ${s.tone}`}>
        <Icon className="h-5 w-5" /> {s.label}
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{s.text}</p>
      <p className="text-xs text-zinc-400 mt-3">
        Requested {fmt(req.created_at)}
        {req.completed_at ? ` · Completed ${fmt(req.completed_at)}` : ` · We finish within ${DELETION_DAYS} days`}
      </p>
    </div>
  );
}

export default async function DataDeletionPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <DukaLogo size={28} />
          <Link href="/terms#privacy" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">Privacy policy</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {code && <StatusCard raw={code} />}

        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Delete your data</h1>
        <P>
          You can delete your Duka account and data at any time. This page explains how, what gets deleted and what we have to keep.
        </P>

        <H2 id="vendors">If you have a Duka store</H2>
        <ol className="list-decimal pl-5 space-y-2 text-zinc-600 dark:text-zinc-400 mb-4">
          <li>Sign in and go to <Link href="/dashboard/settings#danger" className="font-semibold text-amber-700 dark:text-amber-400 underline">Dashboard → Settings</Link>.</li>
          <li>Scroll to <strong>Danger zone</strong>. Tap <strong>Export</strong> first if you want a copy of your products and orders.</li>
          <li>Tap <strong>Delete account</strong>, type your store name and confirm.</li>
        </ol>
        <P>This happens straight away. Can&apos;t sign in? Use the form below and we&apos;ll do it for you.</P>

        <H2 id="shoppers">If you bought from, or chatted with, a Duka store</H2>
        <P>
          Each store on Duka is run by an independent seller. When you order or message a store (on its website, or on WhatsApp, Instagram or Facebook through Duka), your details are kept so the seller can deliver your order.
          Use the form below to ask us to delete them. Tell us which store, and the email or phone number you used.
        </P>

        <H2 id="facebook">If you connected Facebook, Instagram or WhatsApp</H2>
        <P>
          Remove Duka from <strong>Facebook → Settings &amp; privacy → Settings → Business integrations</strong> (or <strong>Apps and websites</strong>).
          That stops Duka getting any new data and sends us a deletion request automatically. You&apos;ll get a code you can check on this page.
        </P>

        <H2 id="what">What we delete</H2>
        <ul className="list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400 mb-4">
          <li>Your sign-in account, name, email and phone number</li>
          <li>Store details: logo, contact info, bank and payout details, ID verification</li>
          <li>Connected WhatsApp, Instagram and Facebook access, and the chats Duka stored for you</li>
          <li>Saved addresses, push notification subscriptions and marketing preferences</li>
        </ul>

        <H2 id="kept">What we keep, and why</H2>
        <P>
          Tax and payment rules require us to keep records of completed sales and payments for as long as the law requires. We keep those records with your personal details removed where we can.
          Copies in backups are removed as the backups expire.
        </P>

        <H2 id="request">Ask us to delete your data</H2>
        <P>We finish within {DELETION_DAYS} days, and you can check progress on this page with your code. We may reply first to confirm it&apos;s really you.</P>
        <DeletionForm />

        <H2 id="status">Check a request</H2>
        <form action="/data-deletion" className="flex gap-2 max-w-md">
          <input
            name="code"
            defaultValue={code ?? ""}
            placeholder="DEL-AB12CD34"
            aria-label="Request code"
            className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white text-sm uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold">Check</button>
        </form>

        <p className="text-sm text-zinc-500 mt-12">
          Questions? Email <a href="mailto:support@dukanigeria.com" className="font-semibold underline">support@dukanigeria.com</a>. Duka is run by Awarizon.
        </p>
      </main>
    </div>
  );
}
