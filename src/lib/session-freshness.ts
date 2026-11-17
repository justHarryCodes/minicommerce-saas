/**
 * Firebase's guidance for session cookies: only mint one from a sign-in that
 * just happened. An ID token lives an hour, so without this a single leaked
 * token (logs, a shared screen, an XSS) could be turned into a 14-day session.
 */
export const RECENT_SIGN_IN_MS = 5 * 60 * 1000;

export function isRecentSignIn(authTimeSeconds: number | undefined, now = Date.now()): boolean {
  return typeof authTimeSeconds === "number" && now - authTimeSeconds * 1000 <= RECENT_SIGN_IN_MS;
}
