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
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex">
      <Sidebar
        store={{ name: store.name, slug: store.slug, logoUrl: store.logo_url }}
      />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Topbar user={user} store={store} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
