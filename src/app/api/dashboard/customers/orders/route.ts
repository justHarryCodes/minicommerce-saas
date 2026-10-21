import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { customerOrders } from "@/lib/customers";

/** A customer's order history (key = normalised phone from the customer list). */
export async function GET(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "customers");
  if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });

  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!/^\d{5,20}$/.test(key)) return NextResponse.json({ error: "Invalid customer" }, { status: 400 });
  return NextResponse.json({ data: await customerOrders(store.id, key) });
}
