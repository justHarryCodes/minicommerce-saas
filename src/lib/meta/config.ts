// Which Meta (WhatsApp / Instagram / Messenger) features this deployment can
// run, from its environment. Nothing here throws: a missing key just turns
// the matching feature off, so the app and website work without any of them.
//
//   META_APP_ID, META_APP_SECRET       the Meta app (developers.facebook.com)
//   META_WEBHOOK_VERIFY_TOKEN          shared with Meta's webhook settings
//   META_TOKEN_ENCRYPTION_KEY          64 hex chars; encrypts vendors' tokens
//   META_ES_CONFIG_ID                  Embedded Signup ("Connect WhatsApp") config
//   META_GRAPH_VERSION                 optional, defaults below
//   WHATSAPP_TEST_PHONE_NUMBER_ID      Meta's free test number (development)
//   WHATSAPP_TEST_WABA_ID
//   WHATSAPP_TEST_ACCESS_TOKEN

const env = (k: string) => (process.env[k] ?? "").trim();

// Meta's docs (Nov 2026) use v27.0 as the latest; override with META_GRAPH_VERSION.
export const GRAPH_VERSION = () => env("META_GRAPH_VERSION") || "v27.0";

/** Meta can deliver webhooks to us and we can check they're genuine. */
export function webhookReady(): boolean {
  return !!env("META_APP_SECRET") && !!env("META_WEBHOOK_VERIFY_TOKEN");
}

/** Vendors' access tokens can be stored encrypted. */
export function tokenCryptoReady(): boolean {
  return /^[0-9a-fA-F]{64}$/.test(env("META_TOKEN_ENCRYPTION_KEY"));
}

/** Vendors can connect their own WhatsApp number with Meta's popup. */
export function embeddedSignupReady(): boolean {
  return !!env("META_APP_ID") && !!env("META_APP_SECRET") && !!env("META_ES_CONFIG_ID") && tokenCryptoReady();
}

/** Meta's test number is set up (for trying the bot before App Review). */
export function testNumberReady(): boolean {
  return !!env("WHATSAPP_TEST_PHONE_NUMBER_ID") && !!env("WHATSAPP_TEST_ACCESS_TOKEN");
}

/** WhatsApp selling can be offered at all on this deployment. */
export function whatsappAvailable(): boolean {
  return webhookReady() && (embeddedSignupReady() || testNumberReady() || !!hostedSignupUrl());
}

export function metaAppId(): string {
  return env("META_APP_ID");
}
export function metaAppSecret(): string {
  return env("META_APP_SECRET");
}
export function webhookVerifyToken(): string {
  return env("META_WEBHOOK_VERIFY_TOKEN");
}
export function embeddedSignupConfigId(): string {
  return env("META_ES_CONFIG_ID");
}
/**
 * Meta-hosted Embedded Signup link (App Dashboard -> WhatsApp -> Embedded
 * Signup -> "Generate link"), with redirect URI https://<site>/api/meta/es-callback.
 */
export function hostedSignupUrl(): string | null {
  const u = env("META_ES_HOSTED_URL");
  return /^https:\/\/[^\s]+$/.test(u) && !!env("META_APP_SECRET") && tokenCryptoReady() ? u : null;
}
export function testNumber():{ phoneNumberId: string; wabaId: string; token: string } | null {
  return testNumberReady()
    ? { phoneNumberId: env("WHATSAPP_TEST_PHONE_NUMBER_ID"), wabaId: env("WHATSAPP_TEST_WABA_ID"), token: env("WHATSAPP_TEST_ACCESS_TOKEN") }
    : null;
}

/** What's missing, for the admin/vendor UI (names only, never values). */
export function whatsappSetupStatus() {
  return {
    available: whatsappAvailable(),
    webhook: webhookReady(),
    embeddedSignup: embeddedSignupReady(),
    testNumber: testNumberReady(),
    missing: [
      !env("META_APP_SECRET") && "META_APP_SECRET",
      !env("META_WEBHOOK_VERIFY_TOKEN") && "META_WEBHOOK_VERIFY_TOKEN",
      !tokenCryptoReady() && "META_TOKEN_ENCRYPTION_KEY",
      !env("META_APP_ID") && "META_APP_ID",
      !env("META_ES_CONFIG_ID") && "META_ES_CONFIG_ID",
    ].filter(Boolean) as string[],
  };
}
