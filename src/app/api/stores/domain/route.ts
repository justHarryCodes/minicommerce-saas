import { NextRequest, NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { hasFeature } from "@/lib/plan";
import { cnameTarget, customDomainsConfigured, isApex, normalizeHostname } from "@/lib/cloudflare";
import { addStoreDomain, DomainError, getStoreDomain, refreshStoreDomain, removeStoreDomain, type StoreDomain } from "@/lib/domains";

async function context() {
  const user = await verifySession();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const store = await getUserStore(user.firebaseUid);
  if (!store) return { error: NextResponse.json({ error: "No store" }, { status: 404 }) };
  return { store };
}

function view(d: (StoreDomain & { cf_hostname_id?: string | null }) | null) {
  if (!d) return null;
  // Cloudflare's internal id stays server-side
  const rest: Partial<typeof d> = { ...d };
  delete rest.cf_hostname_id;
  return { ...rest, apex: isApex(d.hostname) };
}

/** Current domain + whether the feature is available to this store. */
export async function GET() {
  const c = await context();
  if (c.error) return c.error;
  return NextResponse.json({
    available: customDomainsConfigured(),
    isPro: await hasFeature(c.store.id, "custom_domain"),
    target: cnameTarget(),
    domain: view(await getStoreDomain(c.store.id)),
  });
}

/** Connect a domain. */
export async function POST(req: NextRequest) {
  const c = await context();
  if (c.error) return c.error;
  if (!customDomainsConfigured()) {
    return NextResponse.json({ error: "Custom domains aren't switched on for the platform yet." }, { status: 503 });
  }
  if (!(await hasFeature(c.store.id, "custom_domain"))) {
    return NextResponse.json({ error: "Custom domains are a Pro feature. Upgrade from Billing to connect your own domain." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const n = normalizeHostname(String(body.hostname ?? ""));
  if (!n.ok) return NextResponse.json({ error: n.error }, { status: 422 });
  try {
    const d = await addStoreDomain(c.store.id, n.hostname);
    return NextResponse.json({ domain: view(d) }, { status: 201 });
  } catch (err) {
    if (err instanceof DomainError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

/** Re-check DNS / certificate status. */
export async function PATCH() {
  const c = await context();
  if (c.error) return c.error;
  if (!(await hasFeature(c.store.id, "custom_domain"))) {
    return NextResponse.json({ error: "Custom domains are a Pro feature. Upgrade from Billing to reconnect your domain." }, { status: 403 });
  }
  const d = await refreshStoreDomain(c.store.id, c.store.slug);
  return NextResponse.json({ domain: view(d) });
}

/** Disconnect the domain (the free .dukanigeria.com address keeps working). */
export async function DELETE() {
  const c = await context();
  if (c.error) return c.error;
  await removeStoreDomain(c.store.id, c.store.slug);
  return NextResponse.json({ ok: true });
}
