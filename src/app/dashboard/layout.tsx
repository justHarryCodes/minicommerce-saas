import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { verifySession, getUserStore } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/admin-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { SubscriptionGuard } from "@/components/dashboard/SubscriptionGuard";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await verifySession();
  if (!user) redirect("/auth/login");

  const [store, settings, headersList] = await Promise.all([
    getUserStore(user.firebaseUid),
    getPlatformSettings(),
    headers(),
  ]);
  if (!store) redirect("/onboarding");

  // Enforce setup fee gate — skip for /dashboard/billing itself to avoid redirect loop
  const pathname = headersList.get("x-pathname") ?? "";
  const onBillingPage = pathname === "/dashboard/billing" || pathname.startsWith("/dashboard/billing/");

  if (!onBillingPage && settings.require_setup_fee) {
    const paid =
      store.subscriptionStatus === "setup_fee_paid" ||
      store.subscriptionStatus === "subscribed";
    if (!paid) redirect("/dashboard/billing");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        store={{
          name: store.name,
          slug: store.slug,
          logoUrl: store.logoUrl ?? store.logo_url,
        }}
      />

      {/* Main — offset by sidebar width on desktop, full width on mobile */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar user={user} store={store} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-6">
          <SubscriptionGuard />
          {children}
        </main>
      </div>
    </div>
  );
}
