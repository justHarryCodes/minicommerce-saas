import { redirect } from "next/navigation";
import { verifySession, getUserStore } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await verifySession();
  if (!user) redirect("/auth/login");

  const store = await getUserStore(user.firebaseUid);
  if (!store) redirect("/onboarding");

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
          {children}
        </main>
      </div>
    </div>
  );
}
