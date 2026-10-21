import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getStoreAccess } from "@/lib/access";
import { allowedPath, ROLE_LABEL } from "@/lib/access-shared";
import { getPlatformSettings } from "@/lib/admin-auth";
import { getEffectivePlan } from "@/lib/plan";
import { Sidebar } from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import DashboardBottomNav from "@/components/dashboard/DashboardBottomNav";
import { SubscriptionGuard } from "@/components/dashboard/SubscriptionGuard";
import TutorialBanner from "@/components/dashboard/TutorialBanner";
import TawkChat from "@/components/dashboard/TawkChat";

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
  if (!access) redirect("/onboarding");
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

  const effectivePlan = await getEffectivePlan(store.id);

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
      />

      {/* Main — offset by sidebar width on desktop, full width on mobile */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar user={user} store={store} />
        {/* pt-14 = mobile header height; pb-16 = mobile bottom nav height */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 pb-20 lg:pb-8">
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
      </div>

      {/* Mobile bottom nav + FAB */}
      <DashboardBottomNav role={role} />
    </div>
  );
}
