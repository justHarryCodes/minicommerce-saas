import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));
vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import webpush from "web-push";
import { query } from "@/lib/db";

const mockedSend = vi.mocked(webpush.sendNotification);
const mockedQuery = vi.mocked(query);

const ENV_KEYS = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const;
const SUB = { id: "sub1", endpoint: "https://push.example/abc", p256dh: "key", auth: "auth" };

function setVapidEnv(present: boolean) {
  for (const key of ENV_KEYS) {
    if (present) process.env[key] = `test-${key}`;
    else delete process.env[key];
  }
}

describe("webpush", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockedQuery.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("isWebPushEnabled / fail-soft when unconfigured", () => {
    it("reports disabled and skips sending when VAPID env vars are absent", async () => {
      setVapidEnv(false);
      const { isWebPushEnabled, sendWebPush } = await import("@/lib/webpush");

      expect(isWebPushEnabled()).toBe(false);
      const result = await sendWebPush(SUB, { title: "t", body: "b" });
      expect(result).toEqual({ status: "skipped", reason: "not_configured" });
      expect(mockedSend).not.toHaveBeenCalled();
    });

    it("reports enabled when all three VAPID env vars are present", async () => {
      setVapidEnv(true);
      const { isWebPushEnabled } = await import("@/lib/webpush");
      expect(isWebPushEnabled()).toBe(true);
    });
  });

  describe("sendWebPush", () => {
    beforeEach(() => setVapidEnv(true));

    it("returns sent on success", async () => {
      mockedSend.mockResolvedValueOnce({} as never);
      const { sendWebPush } = await import("@/lib/webpush");
      const result = await sendWebPush(SUB, { title: "t", body: "b" });
      expect(result).toEqual({ status: "sent" });
    });

    it("returns expired on a 410 Gone (permanently invalid subscription)", async () => {
      mockedSend.mockRejectedValueOnce(Object.assign(new Error("Gone"), { statusCode: 410 }));
      const { sendWebPush } = await import("@/lib/webpush");
      const result = await sendWebPush(SUB, { title: "t", body: "b" });
      expect(result).toEqual({ status: "expired" });
    });

    it("returns expired on a 404 (subscription not found)", async () => {
      mockedSend.mockRejectedValueOnce(Object.assign(new Error("Not found"), { statusCode: 404 }));
      const { sendWebPush } = await import("@/lib/webpush");
      const result = await sendWebPush(SUB, { title: "t", body: "b" });
      expect(result).toEqual({ status: "expired" });
    });

    it("returns failed (not expired) on other errors, and never throws", async () => {
      mockedSend.mockRejectedValueOnce(Object.assign(new Error("Server error"), { statusCode: 500 }));
      const { sendWebPush } = await import("@/lib/webpush");
      const result = await sendWebPush(SUB, { title: "t", body: "b" });
      expect(result).toEqual({ status: "failed", error: "Server error" });
    });
  });

  describe("sendWebPushToSubject", () => {
    beforeEach(() => setVapidEnv(true));

    it("no-ops without querying the DB when unconfigured", async () => {
      setVapidEnv(false);
      const { sendWebPushToSubject } = await import("@/lib/webpush");
      await sendWebPushToSubject("vendor", "store1", { title: "t", body: "b" });
      expect(mockedQuery).not.toHaveBeenCalled();
    });

    it("sends to every subscription for the subject", async () => {
      mockedQuery.mockResolvedValueOnce([SUB, { ...SUB, id: "sub2", endpoint: "https://push.example/def" }]);
      mockedSend.mockResolvedValue({} as never);
      const { sendWebPushToSubject } = await import("@/lib/webpush");
      await sendWebPushToSubject("vendor", "store1", { title: "t", body: "b" });
      expect(mockedSend).toHaveBeenCalledTimes(2);
    });

    it("deletes expired subscriptions after a 410, and does not touch still-valid ones", async () => {
      mockedQuery.mockResolvedValueOnce([SUB, { ...SUB, id: "sub2", endpoint: "https://push.example/def" }]);
      mockedSend
        .mockRejectedValueOnce(Object.assign(new Error("Gone"), { statusCode: 410 }))
        .mockResolvedValueOnce({} as never);
      const { sendWebPushToSubject } = await import("@/lib/webpush");
      await sendWebPushToSubject("vendor", "store1", { title: "t", body: "b" });

      const deleteCall = mockedQuery.mock.calls.find(([sql]) => (sql as string).includes("DELETE FROM web_push_subscriptions"));
      expect(deleteCall).toBeDefined();
      expect(deleteCall?.[1]).toEqual([["sub1"]]);
    });
  });

  describe("sendWebPushToAllAdmins", () => {
    beforeEach(() => setVapidEnv(true));

    it("fans out to every active admin's subscriptions", async () => {
      mockedQuery
        .mockResolvedValueOnce([{ firebase_uid: "admin1" }, { firebase_uid: "admin2" }]) // admin_users
        .mockResolvedValueOnce([SUB]) // admin1's subs
        .mockResolvedValueOnce([]); // admin2's subs
      mockedSend.mockResolvedValue({} as never);

      const { sendWebPushToAllAdmins } = await import("@/lib/webpush");
      await sendWebPushToAllAdmins({ title: "t", body: "b" });

      expect(mockedSend).toHaveBeenCalledTimes(1);
      const adminQuery = mockedQuery.mock.calls[0];
      expect((adminQuery[0] as string)).toContain("FROM admin_users");
    });
  });
});
