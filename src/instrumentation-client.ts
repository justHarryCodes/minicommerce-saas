// Client-side counterpart to src/instrumentation.ts. Error tracking only —
// session replay is intentionally not enabled (cost + privacy).
//
// Performance: the Sentry browser SDK is ~115 kB gzipped. Importing it
// statically put it on the critical path of every page (storefronts
// included) even when no DSN was configured. Now it isn't bundled into the
// page at all without a DSN, and with one it loads once the browser is idle,
// after the page is interactive.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && typeof window !== "undefined") {
  const load = () => {
    import("@sentry/nextjs")
      .then((Sentry) => Sentry.init({ dsn, tracesSampleRate: 0.1 }))
      .catch(() => {});
  };
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 5000 });
  else setTimeout(load, 3000);
}
