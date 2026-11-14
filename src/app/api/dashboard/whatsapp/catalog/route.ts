import { NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { whatsappAvailable } from "@/lib/meta/config";
import { syncStoreCatalog } from "@/lib/meta/catalog";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// "Sync now": the store's products <-> its WhatsApp / Meta catalog, both ways. Owner only.
export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "Only the store owner can sync the catalog" }, { status: 403 });
  if (!whatsappAvailable()) return NextResponse.json({ error: "WhatsApp selling isn't switched on yet" }, { status: 503 });
  const limited = await checkRateLimit(req, { key: `rl:catalog-sync:${store.id}`, max: 6, window: 600, message: "You just synced. Try again in a few minutes." });
  if (limited) return limited;
  const result = await syncStoreCatalog(store.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
