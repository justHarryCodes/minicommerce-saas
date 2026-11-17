import { afterEach, describe, expect, it } from "vitest";
import { embeddedSignupConfigId, embeddedSignupFeatureType, embeddedSignupReady, isBusinessAppOnboarding } from "@/lib/meta/config";

// The "Connect WhatsApp" popup needs a Login for Business config id. A
// deployment that only pasted Meta's hosted signup link should still get
// the popup, using the config id and flow carried inside that link.

const KEYS = ["META_ES_CONFIG_ID", "META_ES_HOSTED_URL", "META_ES_FEATURE_TYPE", "META_APP_ID", "META_APP_SECRET", "META_TOKEN_ENCRYPTION_KEY"];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const hosted = (extras: object, configId = "1234567890123456") =>
  `https://business.facebook.com/messaging/whatsapp/onboard/?app_id=111&config_id=${configId}&extras=${encodeURIComponent(JSON.stringify(extras))}&redirect_uri=https%3A%2F%2Fdukanigeria.com%2Fapi%2Fmeta%2Fes-callback`;

describe("embedded signup config", () => {
  it("uses META_ES_CONFIG_ID when set", () => {
    process.env.META_ES_CONFIG_ID = "9876543210";
    process.env.META_ES_HOSTED_URL = hosted({});
    expect(embeddedSignupConfigId()).toBe("9876543210");
  });

  it("falls back to the config id inside the hosted link", () => {
    delete process.env.META_ES_CONFIG_ID;
    process.env.META_ES_HOSTED_URL = hosted({ version: "v4" });
    expect(embeddedSignupConfigId()).toBe("1234567890123456");
  });

  it("ignores a missing or malformed config id", () => {
    delete process.env.META_ES_CONFIG_ID;
    process.env.META_ES_HOSTED_URL = "not a url";
    expect(embeddedSignupConfigId()).toBe("");
    process.env.META_ES_HOSTED_URL = hosted({}, "abc");
    expect(embeddedSignupConfigId()).toBe("");
  });

  it("reads the flow (featureType) from the hosted link, or the override", () => {
    delete process.env.META_ES_FEATURE_TYPE;
    process.env.META_ES_HOSTED_URL = hosted({ version: "v4", sessionInfoVersion: "3", featureType: "whatsapp_business_app_onboarding" });
    expect(embeddedSignupFeatureType()).toBe("whatsapp_business_app_onboarding");
    expect(isBusinessAppOnboarding()).toBe(true);
    process.env.META_ES_FEATURE_TYPE = "only_waba_sharing";
    expect(isBusinessAppOnboarding()).toBe(false);
  });

  it("turns the popup on from the hosted link alone", () => {
    delete process.env.META_ES_CONFIG_ID;
    process.env.META_ES_HOSTED_URL = hosted({});
    process.env.META_APP_ID = "111";
    process.env.META_APP_SECRET = "secret";
    process.env.META_TOKEN_ENCRYPTION_KEY = "a".repeat(64);
    expect(embeddedSignupReady()).toBe(true);
  });
});
