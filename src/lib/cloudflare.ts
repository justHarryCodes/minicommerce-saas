// Cloudflare for SaaS — custom hostnames for merchant domains.
//
// Merchant points  shop.theirbrand.com  CNAME →  CUSTOM_DOMAIN_TARGET
// (e.g. stores.dukanigeria.com); Cloudflare validates the hostname and
// issues its certificate over HTTP once the CNAME resolves to us, and the
// subdomain Worker (cloudflare-worker/subdomain-proxy.js) maps it to the store.
//
// Env: CLOUDFLARE_API_TOKEN (Zone → SSL and Certificates: Edit),
//      CLOUDFLARE_ZONE_ID   (the dukanigeria.com zone),
//      CUSTOM_DOMAIN_TARGET (the CNAME target / fallback origin hostname)

const API = "https://api.cloudflare.com/client/v4";

export function customDomainsConfigured(): boolean {
  return !!process.env.CLOUDFLARE_API_TOKEN && !!process.env.CLOUDFLARE_ZONE_ID && !!process.env.CUSTOM_DOMAIN_TARGET;
}

export function cnameTarget(): string {
  return process.env.CUSTOM_DOMAIN_TARGET ?? "stores.dukanigeria.com";
}

export interface DnsRecord {
  type: "CNAME" | "TXT";
  name: string;
  value: string;
  purpose: string;
}

export interface CustomHostname {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string | null;
  records: DnsRecord[];
  errors: string[];
}

interface CfHostname {
  id: string;
  hostname: string;
  status: string;
  ssl?: {
    status?: string;
    txt_name?: string;
    txt_value?: string;
    validation_records?: { txt_name?: string; txt_value?: string }[];
    validation_errors?: { message: string }[];
  };
  ownership_verification?: { type?: string; name?: string; value?: string };
  verification_errors?: string[];
}

async function cf<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}/zones/${process.env.CLOUDFLARE_ZONE_ID}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; result?: T; errors?: { message: string }[] };
  if (!res.ok || json.success === false) {
    throw new Error(json.errors?.map((e) => e.message).join("; ") || `Cloudflare error ${res.status}`);
  }
  return json.result as T;
}

function mapHostname(h: CfHostname): CustomHostname {
  const records: DnsRecord[] = [
    { type: "CNAME", name: h.hostname, value: cnameTarget(), purpose: "Points your domain at your Duka store" },
  ];
  // Only needed if the CNAME alone can't prove ownership (e.g. the domain is
  // behind another proxy) — shown as optional extras in the dashboard.
  if (h.ownership_verification?.name && h.ownership_verification.value) {
    records.push({ type: "TXT", name: h.ownership_verification.name, value: h.ownership_verification.value, purpose: "Proves you own the domain" });
  }
  const sslTxt = h.ssl?.validation_records?.find((r) => r.txt_name && r.txt_value) ?? (h.ssl?.txt_name ? h.ssl : undefined);
  if (sslTxt?.txt_name && sslTxt.txt_value) {
    records.push({ type: "TXT", name: sslTxt.txt_name, value: sslTxt.txt_value, purpose: "Lets us issue the SSL certificate" });
  }
  return {
    id: h.id,
    hostname: h.hostname,
    status: h.status,
    sslStatus: h.ssl?.status ?? null,
    records,
    errors: [...(h.verification_errors ?? []), ...(h.ssl?.validation_errors?.map((e) => e.message) ?? [])],
  };
}

export async function createCustomHostname(hostname: string): Promise<CustomHostname> {
  const h = await cf<CfHostname>("/custom_hostnames", {
    method: "POST",
    body: JSON.stringify({ hostname, ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } } }),
  });
  return mapHostname(h);
}

export async function getCustomHostname(id: string): Promise<CustomHostname> {
  return mapHostname(await cf<CfHostname>(`/custom_hostnames/${id}`));
}

export async function deleteCustomHostname(id: string): Promise<void> {
  await cf(`/custom_hostnames/${id}`, { method: "DELETE" });
}

/** Live = hostname verified AND certificate issued. */
export function isLive(h: Pick<CustomHostname, "status" | "sslStatus">): boolean {
  return h.status === "active" && h.sslStatus === "active";
}

const ROOT = (process.env.ROOT_DOMAIN ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "dukanigeria.com").toLowerCase().replace(/^www\./, "");

/**
 * Clean up what a merchant typed ("https://Shop.Brand.com/") and reject
 * things that can't work: our own domains, IPs, localhost, bad syntax.
 */
export function normalizeHostname(input: string): { ok: true; hostname: string } | { ok: false; error: string } {
  const host = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  if (!host) return { ok: false, error: "Enter a domain, e.g. shop.yourbrand.com" };
  if (host.length > 253 || !/^(?=.{1,253}$)([a-z0-9](-*[a-z0-9])*)(\.[a-z0-9](-*[a-z0-9])*)+$/.test(host)) {
    return { ok: false, error: "That doesn't look like a valid domain" };
  }
  if (/^\d+(\.\d+){3}$/.test(host) || host === "localhost") return { ok: false, error: "Use a domain name, not an IP address" };
  if (host === ROOT || host.endsWith(`.${ROOT}`) || /(^|\.)awarizonmall\.com$/.test(host)) {
    return { ok: false, error: `Use your own domain — ${ROOT} addresses are already yours for free` };
  }
  if (!/\.[a-z]{2,}$/.test(host)) return { ok: false, error: "That doesn't look like a valid domain" };
  return { ok: true, hostname: host };
}

/** Bare domains (yourbrand.com) need CNAME flattening / ALIAS support at the DNS host. */
export function isApex(hostname: string): boolean {
  const parts = hostname.split(".");
  // brand.com, brand.ng, brand.com.ng
  return parts.length === 2 || (parts.length === 3 && /^(com|org|net|edu|gov)$/.test(parts[1]) && parts[2].length === 2);
}
