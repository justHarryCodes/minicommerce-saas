// Where a shopper lands after paying. Paystack calls back to the main app
// (dukanigeria.com/api/payments/callback), but the shopper may have paid from
// the store's subdomain or custom domain — and their cart lives on that
// origin, so the receipt (which clears it) must open there too.
//
// The redirect is always absolute: behind the hosting proxy the request URL
// reads http://localhost:3000, so a relative redirect resolved against it
// sent shoppers to localhost.

function originOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}

/**
 * Absolute URL of a store page (`path` like "/receipt/123?t=…") on the
 * address the shopper came from — if that address really is this store's
 * (its subdomain, its custom domain, or the main site's /store/<slug>).
 * Anything else falls back to the store's own address: never an open redirect.
 */
export function storePageUrl(opts: {
  slug: string;
  customDomain: string | null;
  returnTo: string | null;
  appUrl: string;
  rootDomain: string | null | undefined;
  path: string;
}): string {
  const app = originOf(opts.appUrl) ?? "https://dukanigeria.com";
  const subdomain = opts.rootDomain ? `https://${opts.slug}.${opts.rootDomain.replace(/^www\./, "")}` : null;
  const custom = opts.customDomain ? `https://${opts.customDomain.toLowerCase()}` : null;
  const back = originOf(opts.returnTo);

  if (back && (back === subdomain || back === custom)) return back + opts.path;
  if (back && back === app) return `${app}/store/${opts.slug}${opts.path}`;
  // No (or an unrecognised) return address: the store's own front door
  const home = custom ?? subdomain;
  return home ? home + opts.path : `${app}/store/${opts.slug}${opts.path}`;
}

/** Absolute URL on the main app (dashboard pages, home). */
export function appPageUrl(appUrl: string, path: string): string {
  return `${originOf(appUrl) ?? "https://dukanigeria.com"}${path}`;
}
