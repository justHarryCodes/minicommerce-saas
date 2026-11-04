import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getStoreAccess, pausedMembershipStore } from "@/lib/access";
import { allowedPath, ROLE_LABEL } from "@/lib/access-shared";
import { getPlatformSettings } from "@/lib/admin-auth";
import { getEffectivePlan, getStoreFeatures } from "@/lib/plan";
import { Sidebar } from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import DashboardBottomNav from "@/components/dashboard/DashboardBottomNav";
import { SubscriptionGuard } from "@/components/dashboard/SubscriptionGuard";
import TutorialBanner from "@/components/dashboard/TutorialBanner";
import TawkChat from "@/components/dashboard/TawkChat";
import DashboardFrame from "@/components/dashboard/DashboardFrame";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await verifySession();
  if (!user) redirect("/auth/login");

  // The store this person works in: their own, else one they're a team member of
  const [access, settings, headersList] = await Promise.all([
    getStoreAccess(user),
    getPlatformSettings(),
    headers(),
  ]);
  if (!access) redirect((await pausedMembershipStore(user)) ? "/team/paused" : "/onboarding");
  const { store, role } = access;

  const pathname = headersList.get("x-pathname") ?? "";
  const onBillingPage = pathname === "/dashboard/billing" || pathname.startsWith("/dashboard/billing/");

  // Team members only ever see the areas their role allows
  if (role !== "owner" && pathname && !allowedPath(role, pathname)) {
    redirect("/dashboard/orders");
  }

  // Enforce setup fee gate — skip for /dashboard/billing itself to avoid redirect loop
  const paid =
    !settings.require_setup_fee ||
    store.subscriptionStatus === "setup_fee_paid" ||
    store.subscriptionStatus === "subscribed";
  if (!onBillingPage && !paid && role === "owner") redirect("/dashboard/billing");

  const [effectivePlan, features, attention] = await Promise.all([
    getEffectivePlan(store.id),
    getStoreFeatures(store.id),
    // Sidebar badge: orders waiting on the store (new, or a transfer to confirm)
    queryOne<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM orders
       WHERE store_id = $1 AND (order_status = 'pending' OR payment_status = 'pending_confirmation')`,
      [store.id]
    ).catch(() => null),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        store={{
          name: store.name,
          slug: store.slug,
          logoUrl: store.logoUrl ?? store.logo_url,
          customDomain: store.customDomain ?? store.custom_domain ?? null,
        }}
        isPro={effectivePlan.isPro}
        role={role}
        features={[...features]}
        badges={{ "/dashboard/orders": attention?.n ?? 0 }}
      />

      {/* Main — offset by the sidebar (full or icon rail) on desktop */}
      <DashboardFrame>
        <Topbar user={user} store={store} role={role} />
        {/* pt-14 clears the 48px mobile header; pb-20 the mobile bottom nav */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-20 pt-14 sm:px-4 lg:px-5 lg:pb-6 lg:pt-4">
          {role === "owner" ? (
            <>
              <SubscriptionGuard />
              <TutorialBanner />
            </>
          ) : (
            <p className="mb-4 mt-4 lg:mt-0 text-xs text-zinc-500 dark:text-zinc-400">
              Signed in as <span className="font-semibold text-zinc-800 dark:text-zinc-200">{ROLE_LABEL[role]}</span> at {store.name}
            </p>
          )}
          {role !== "owner" && !paid ? (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-lg font-bold text-zinc-900 dark:text-white">{store.name} isn&apos;t active yet</p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                The store owner needs to finish setting up billing before the team can use the dashboard.
              </p>
            </div>
          ) : (
            children
          )}
          <TawkChat />
        </main>
      </DashboardFrame>

      {/* Mobile bottom nav + FAB */}
      <DashboardBottomNav role={role} />
    </div>
  );
}
