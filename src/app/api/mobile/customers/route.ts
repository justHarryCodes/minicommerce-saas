import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { requireFeature } from "@/lib/plan";
import { listCustomers } from "@/lib/customers";

export const dynamic = "force-dynamic";

// Vendor app: the store's customers (same list as Dashboard -> Customers).
// One customer's orders: GET /api/dashboard/customers/orders?key=<key>
export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "customers");
  if (!store) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const denied = await requireFeature(store.id, "customers");
  if (denied) return denied;

  const customers = await listCustomers(store.id, 1000);
  return NextResponse.json({ customers });
}
