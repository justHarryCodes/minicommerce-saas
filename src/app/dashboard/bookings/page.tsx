import { redirect } from "next/navigation";
import { featureGate } from "@/components/dashboard/FeatureGate";
import { verifySession } from "@/lib/auth";
import { getPageStore } from "@/lib/access";
import { query } from "@/lib/db";
import { lagosParts } from "@/lib/hours";
import BookingsClient from "./BookingsClient";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  const store = await getPageStore(user, "bookings");
  if (!store) redirect("/onboarding");
  const gate = await featureGate(store.id, "bookings");
  if (gate) return gate;

  const [services, staff] = await Promise.all([
    query<{ id: string; name: string; duration_minutes: number | null }>(
      "SELECT id, name, duration_minutes FROM products WHERE store_id = $1 AND is_bookable = true AND is_active = true ORDER BY name",
      [store.id]
    ),
    query<{ id: string; name: string; role: string | null; product_ids: string[] }>(
      "SELECT id, name, role, product_ids FROM staff_members WHERE store_id = $1 AND is_active = true ORDER BY sort_order, created_at",
      [store.id]
    ),
  ]);
  const s = store as unknown as Record<string, unknown>;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pt-4 lg:pt-0">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Bookings</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Appointments for your services, your team, and when people can book.
        </p>
      </div>
      <BookingsClient
        storeId={store.id}
        storeName={store.name}
        today={lagosParts(new Date()).date}
        services={services}
        initialStaff={staff.map((m) => ({ id: m.id, name: m.name, role: m.role, productIds: m.product_ids ?? [] }))}
        settings={{
          slotMinutes: Number(s.bookingSlotMinutes ?? 30),
          bufferMinutes: Number(s.bookingBufferMinutes ?? 0),
          windowDays: Number(s.bookingWindowDays ?? 30),
          minNoticeMinutes: Number(s.bookingMinNoticeMinutes ?? 60),
        }}
      />
    </div>
  );
}
