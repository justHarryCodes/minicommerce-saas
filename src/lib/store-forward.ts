// Edge-safe (used by middleware). Decides whether "this request is for
// store X" headers can be believed: they must come from our Cloudflare
// Worker (shared secret, when configured) and name the same store as the
// /store/<slug> path. Otherwise a client could pass itself off as another
// store by sending the header itself.
export function trustedStoreForward(
  pathname: string,
  get: (name: string) => string | null,
  secret: string | undefined = process.env.WORKER_SECRET
): boolean {
  const claimed = get("x-store-slug");
  if (!claimed) return false;
  if (secret && get("x-worker-secret") !== secret) return false;
  const inPath = pathname.startsWith("/store/") ? pathname.split("/")[2] : undefined;
  if (!inPath) return true;
  try {
    return decodeURIComponent(inPath) === claimed;
  } catch {
    return false;
  }
}
