// Which Meta (WhatsApp / Instagram / Messenger) features this deployment can
// run, from its environment. Nothing here throws: a missing key just turns
// the matching feature off, so the app and website work without any of them.
//
//   META_APP_ID, META_APP_SECRET       the Meta app (developers.facebook.com)
//   META_WEBHOOK_VERIFY_TOKEN          shared with Meta's webhook settings
//   META_TOKEN_ENCRYPTION_KEY          64 hex chars; encrypts vendors' tokens
//   META_ES_CONFIG_ID                  Embedded Signup ("Connect WhatsApp") config
//                                      (optional when META_ES_HOSTED_URL carries config_id)
//   META_ES_HOSTED_URL                 Meta-hosted signup link (fallback page)
//   META_ES_FEATURE_TYPE               optional; else read from the hosted link's extras
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
  return !!env("META_APP_ID") && !!env("META_APP_SECRET") && !!embeddedSignupConfigId() && tokenCryptoReady();
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
/** A setting carried inside the hosted signup link (config_id, extras), if any. */
function hostedParam(name: string): string {
  try {
    return new URL(env("META_ES_HOSTED_URL")).searchParams.get(name) ?? "";
  } catch {
    return "";
  }
}

/**
 * The Login for Business configuration used by the "Connect WhatsApp" popup.
 * Falls back to the one inside the hosted signup link, so a deployment that
 * only pasted the link still gets the popup (which returns to Duka reliably).
 */
export function embeddedSignupConfigId(): string {
  const id = env("META_ES_CONFIG_ID") || hostedParam("config_id");
  return /^\d{5,30}$/.test(id) ? id : "";
}

/**
 * Which signup flow the configuration is for, e.g.
 * "whatsapp_business_app_onboarding" (numbers already on the WhatsApp
 * Business app). Taken from the hosted link's extras; empty = a fresh number.
 */
export function embeddedSignupFeatureType(): string {
  const set = env("META_ES_FEATURE_TYPE");
  if (set) return set;
  try {
    const t = JSON.parse(hostedParam("extras") || "{}")?.featureType;
    return typeof t === "string" ? t : "";
  } catch {
    return "";
  }
}

/** Numbers onboarded from the WhatsApp Business app are already registered. */
export function isBusinessAppOnboarding(): boolean {
  return embeddedSignupFeatureType() === "whatsapp_business_app_onboarding";
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
      !embeddedSignupConfigId() && "META_ES_CONFIG_ID",
    ].filter(Boolean) as string[],
  };
}
