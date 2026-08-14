import * as Sentry from "@sentry/nextjs";

// Runs once per server/edge process. `Sentry.init` with an undefined `dsn`
// is documented to no-op cleanly (no events sent) — same "build it, add the
// key later" pattern as the Groq/Gemini AI routes, so no manual gate needed
// here beyond what the SDK already does.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
