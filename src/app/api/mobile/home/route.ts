import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getAccessFor } from "@/lib/access";
import { allowedPath } from "@/lib/access-shared";
import { getStoreFeatures } from "@/lib/plan";
import { getStoreUrl } from "@/lib/utils";
import { clLogo } from "@/lib/cloudinary";
import { loadOverview, overviewChecklist } from "@/lib/dashboard-overview";

export const dynamic = "force-dynamic";

// Vendor app home: the same numbers as the phone layout of /dashboard
// (stories row, today card, setup steps, chat-style orders, best sellers).
// `allow` says which dashboard sections this person's role can open, so the
// app hides shortcuts they can't use.
const SECTIONS: Record<string, string> = {
  orders: "/dashboard/orders",
  products: "/dashboard/products",
  bookings: "/dashboard/bookings",
  abandoned: "/dashboard/abandoned",
  settings: "/dashboard/settings",
  themes: "/dashboard/themes",
  storefront: "/dashboard/storefront",
  coupons: "/dashboard/coupons",
  growth: "/dashboard/growth",
  whatsapp: "/dashboard/whatsapp",
  reels: "/dashboard/reels",
  pos: "/dashboard/pos",
  customers: "/dashboard/customers",
  analytics: "/dashboard/analytics",
  billing: "/dashboard/billing",
};

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await getAccessFor(user, "overview");
  if (!access) return NextResponse.json({ error: "No store" }, { status: 404 });
  const { store, role } = access;

  const [d, features] = await Promise.all([loadOverview(store.id), getStoreFeatures(store.id)]);
  const logo = store.logoUrl ?? store.logo_url;
  const allow = Object.fromEntries(Object.entries(SECTIONS).map(([key, path]) => [key, allowedPath(role, path)]));

  return NextResponse.json({
    pro: features.has("analytics"),
    role,
    firstName: (user.displayName ?? "").trim().split(/\s+/)[0] || null,
    store: {
      name: store.name,
      slug: store.slug,
      url: getStoreUrl(store.slug, store.customDomain ?? store.custom_domain),
      logo: logo ? clLogo(logo) : null,
    },
    k: d.k,
    visitors7: d.visitors.v7,
    series: d.series,
    attention: d.attention,
    checklist: overviewChecklist(store as unknown as Record<string, unknown>, d),
    recent: d.recent.map((o) => ({ ...o, total: Number(o.total), items: Number(o.items) })),
    top: d.top.map((p) => ({ ...p, qty: Number(p.qty), revenue: Number(p.revenue) })),
    allow,
  });
}
