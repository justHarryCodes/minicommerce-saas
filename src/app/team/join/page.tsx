import Image from "next/image";
import Link from "next/link";
import { verifySession } from "@/lib/auth";
import { findInvite, normaliseEmail } from "@/lib/team";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/access-shared";
import AcceptInviteButton from "./AcceptInviteButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join a store team · Duka" };

export default async function JoinTeamPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const [found, user] = await Promise.all([findInvite(token), verifySession()]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Image src="/logo.png" alt="Duka" width={84} height={28} style={{ height: 28, width: "auto" }} />

        {!found.ok ? (
          <>
            <h1 className="mt-8 text-xl font-bold text-zinc-900 dark:text-white">Invitation unavailable</h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{found.error}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/api/team/dismiss" className="rounded-xl border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                Set up my own store instead
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="mt-8 flex items-center gap-3">
              {found.invite.store_logo ? (
                <Image src={found.invite.store_logo} alt="" width={48} height={48} className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-lg font-bold text-white dark:bg-white dark:text-zinc-900">
                  {found.invite.store_name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">You&apos;re invited to</p>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{found.invite.store_name}</h1>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Role: {ROLE_LABEL[found.invite.role]}</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{ROLE_DESCRIPTION[found.invite.role]}</p>
            </div>

            {!user ? (
              <div className="mt-6 space-y-2">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Sign in or create an account with <strong className="text-zinc-800 dark:text-zinc-200">{found.invite.email}</strong> to accept.
                </p>
                <a href={`/api/team/invite-start?token=${encodeURIComponent(token)}`} className="block rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
                  Sign in to accept
                </a>
                <a href={`/api/team/invite-start?token=${encodeURIComponent(token)}&mode=signup`} className="block rounded-xl border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                  Create an account
                </a>
              </div>
            ) : normaliseEmail(user.email) !== normaliseEmail(found.invite.email) ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                You&apos;re signed in as <strong>{user.email}</strong>, but this invitation is for <strong>{found.invite.email}</strong>.
                Sign out and sign in with that email to accept.
              </div>
            ) : (
              <AcceptInviteButton token={token} storeName={found.invite.store_name} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
