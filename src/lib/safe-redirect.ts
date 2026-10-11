// Only allow same-site relative paths ("/checkout", "/account/orders?x=1").
// Rejects absolute URLs, protocol-relative ("//evil.com"), backslash tricks
// and anything that doesn't resolve to our own origin.
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  try {
    const base = "http://local.invalid";
    const u = new URL(value, base);
    if (u.origin !== base) return null;
    return u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
}
