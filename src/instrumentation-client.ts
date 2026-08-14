import * as Sentry from "@sentry/nextjs";

// Client-side counterpart to src/instrumentation.ts. Same no-DSN-means-off
// behavior. Session replay is intentionally not enabled here (cost +
// privacy) — this is error tracking, not a full observability suite.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
