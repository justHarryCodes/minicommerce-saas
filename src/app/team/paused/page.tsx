import Image from "next/image";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { getStoreAccess, pausedMembershipStore } from "@/lib/access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team access paused · Duka" };

export default async function TeamPausedPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  // Access came back (plan renewed) — straight back to work
  if (await getStoreAccess(user)) redirect("/dashboard/orders");
  const storeName = await pausedMembershipStore(user);
  if (!storeName) redirect("/onboarding");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <Image src="/logo.png" alt="Duka" width={84} height={28} style={{ height: 28, width: "auto" }} className="mx-auto" />
        <h1 className="mt-8 text-xl font-bold text-zinc-900 dark:text-white">Team access is paused</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {storeName}&apos;s plan doesn&apos;t include team accounts right now. Your login will work again as soon as the owner renews their plan.
        </p>
      </div>
    </main>
  );
}
