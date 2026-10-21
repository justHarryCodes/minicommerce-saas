import { redirect } from "next/navigation";
import { verifySession, getUserStore } from "@/lib/auth";
import { listCustomers } from "@/lib/customers";
import CustomersClient from "./CustomersClient";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  const store = await getUserStore(user.firebaseUid);
  if (!store) redirect("/onboarding");

  const customers = await listCustomers(store.id);

  return (
    <div className="max-w-5xl mx-auto space-y-5 pt-4 lg:pt-0">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Customers</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Everyone who has ordered from you, with what they&apos;ve spent and when they last bought.
        </p>
      </div>
      <CustomersClient
        storeName={store.name}
        customers={customers.map((c) => ({
          ...c,
          total_spent: Number(c.total_spent),
          first_order_at: new Date(c.first_order_at).toISOString(),
          last_order_at: new Date(c.last_order_at).toISOString(),
        }))}
      />
    </div>
  );
}
