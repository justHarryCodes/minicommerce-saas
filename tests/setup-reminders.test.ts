import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/paystack", () => ({ getAppUrl: () => "https://dukanigeria.com" }));
vi.mock("@/lib/notify/providers", () => ({ sendEmail: vi.fn(), emailConfigured: vi.fn() }));
vi.mock("@/lib/push", () => ({ notifyStoreEvent: vi.fn() }));
vi.mock("@/lib/firebase-admin", () => ({ adminAuth: { getUser: vi.fn(), listUsers: vi.fn() } }));

import { query, queryOne } from "@/lib/db";
import { sendEmail, emailConfigured } from "@/lib/notify/providers";
import { notifyStoreEvent } from "@/lib/push";
import { adminAuth } from "@/lib/firebase-admin";
import {
  buildNoStoreReminder, buildStoreReminder, dueStep, inSendingHours, isSetUp, missingTasks, sendDueSetupReminders, unsubscribeToken, verifyUnsubscribe,
} from "@/lib/notify/setup-reminders";

// Vendors who haven't finished setting up get nudged on day 1, 3, 7 and 14.

const NOON_LAGOS = new Date("2026-11-12T11:00:00Z"); // 12:00 in Lagos
const TEN_AM_LAGOS = new Date("2026-11-12T09:15:00Z");
const daysAgo = (d: number, from = NOON_LAGOS) => new Date(from.getTime() - d * 86_400_000);

describe("when a reminder is due", () => {
  it("follows day 1, 3, 7 and 14, one at a time", () => {
    expect(dueStep(0.5, 0)).toBeNull();
    expect(dueStep(1.2, 0)).toBe(1);
    expect(dueStep(2, 1)).toBeNull();
    expect(dueStep(3.1, 1)).toBe(2);
    expect(dueStep(7, 2)).toBe(3);
    expect(dueStep(14, 3)).toBe(4);
    expect(dueStep(29, 4)).toBeNull(); // done after four
  });

  it("never sends a backlog: found late, it gets the latest message only", () => {
    expect(dueStep(10, 0)).toBe(3);
  });

  it("only between 9am and 8pm Lagos", () => {
    expect(inSendingHours(new Date("2026-11-12T07:59:00Z"))).toBe(false); // 08:59
    expect(inSendingHours(new Date("2026-11-12T08:00:00Z"))).toBe(true); // 09:00
    expect(inSendingHours(new Date("2026-11-12T18:59:00Z"))).toBe(true); // 19:59
    expect(inSendingHours(new Date("2026-11-12T19:00:00Z"))).toBe(false); // 20:00
  });
});

describe("what counts as set up", () => {
  it("needs products and a way to get paid; a logo is optional", () => {
    expect(isSetUp({ products: 3, hasPayout: true, hasLogo: false })).toBe(true);
    expect(isSetUp({ products: 0, hasPayout: true, hasLogo: true })).toBe(false);
    expect(isSetUp({ products: 3, hasPayout: false, hasLogo: true })).toBe(false);
    expect(missingTasks({ products: 0, hasPayout: false, hasLogo: false })).toEqual(["products", "payout", "logo"]);
  });
});

describe("the messages", () => {
  it("lists exactly what's missing, with links, and escapes names", () => {
    const m = buildStoreReminder({
      step: 1, storeName: "Amaka <Boutique>", ownerName: "Amaka Obi", missing: ["products", "payout"],
      appUrl: "https://dukanigeria.com", unsubscribeUrl: "https://dukanigeria.com/u",
    });
    expect(m.subject).toContain("Amaka <Boutique>");
    expect(m.html).toContain("Hi Amaka");
    expect(m.html).toContain("Amaka &lt;Boutique&gt;");
    expect(m.html).not.toContain("<Boutique>");
    expect(m.html).toContain("https://dukanigeria.com/dashboard/products/new");
    expect(m.html).toContain("https://dukanigeria.com/dashboard/settings#payments");
    expect(m.html).toContain("Stop these reminders");
    expect(m.pushTitle).toMatch(/first product/);
  });

  it("each of the four reminders reads differently", () => {
    const subjects = [1, 2, 3, 4].map((step) => buildStoreReminder({ step, storeName: "Amaka", missing: ["products"], appUrl: "x", unsubscribeUrl: "u" }).subject);
    expect(new Set(subjects).size).toBe(4);
    expect(subjects[3]).toMatch(/Last reminder/);
  });

  it("people with no store are sent to create one", () => {
    const m = buildNoStoreReminder({ step: 1, name: "Tunde", appUrl: "https://dukanigeria.com", unsubscribeUrl: "u" });
    expect(m.html).toContain("https://dukanigeria.com/onboarding");
    expect(m.html).toContain("Hi Tunde");
  });
});

describe("unsubscribe links", () => {
  it("are signed per account", () => {
    const t = unsubscribeToken("store:abc123", "key")!;
    expect(verifyUnsubscribe("store:abc123", t, "key")).toBe(true);
    expect(verifyUnsubscribe("store:other99", t, "key")).toBe(false);
    expect(verifyUnsubscribe("store:abc123", "forged", "key")).toBe(false);
  });
});

describe("the scheduled job", () => {
  const storeRow = (over: Record<string, unknown> = {}) => ({
    id: "s1", name: "Amaka", owner_id: "uid1", owner_email: "amaka@example.com", created_at: daysAgo(1.5),
    products: 0, has_payout: false, has_logo: false, step: null, ...over,
  });

  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(queryOne).mockReset().mockResolvedValue(null);
    vi.mocked(sendEmail).mockReset().mockResolvedValue({ ok: true });
    vi.mocked(emailConfigured).mockReturnValue(true);
    vi.mocked(notifyStoreEvent).mockReset().mockResolvedValue(undefined);
    vi.mocked(adminAuth.getUser).mockResolvedValue({ email: "amaka@example.com", displayName: "Amaka Obi" } as never);
    vi.mocked(adminAuth.listUsers).mockReset();
  });

  function routeQueries(stores: unknown[], claimed = true) {
    vi.mocked(query).mockImplementation(async (sql: unknown) => {
      const s = String(sql);
      if (s.includes("FROM stores s")) return stores as never;
      if (s.includes("INSERT INTO setup_reminders")) return (claimed ? [{ subject: "x" }] : []) as never;
      return [] as never;
    });
  }

  it("does nothing when turned off, or outside sending hours", async () => {
    expect(await sendDueSetupReminders({ enabled: false, now: NOON_LAGOS })).toMatchObject({ stores: 0, skipped: expect.stringMatching(/off/) });
    expect(await sendDueSetupReminders({ enabled: true, now: new Date("2026-11-12T22:00:00Z") })).toMatchObject({ stores: 0, skipped: expect.stringMatching(/9am/) });
    expect(query).not.toHaveBeenCalled();
  });

  it("emails and notifies a store with no products", async () => {
    routeQueries([storeRow()]);
    const res = await sendDueSetupReminders({ enabled: true, now: NOON_LAGOS });
    expect(res.stores).toBe(1);
    expect(sendEmail).toHaveBeenCalledWith("amaka@example.com", expect.stringContaining("Amaka"), expect.stringContaining("Add a product"));
    expect(notifyStoreEvent).toHaveBeenCalledWith("s1", expect.objectContaining({ type: "setup_reminder", url: "/dashboard/products/new" }));
  });

  it("leaves finished stores alone", async () => {
    routeQueries([storeRow({ products: 4, has_payout: true })]);
    expect((await sendDueSetupReminders({ enabled: true, now: NOON_LAGOS })).stores).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("never double-sends when another run already claimed the step", async () => {
    routeQueries([storeRow()], false);
    expect((await sendDueSetupReminders({ enabled: true, now: NOON_LAGOS })).stores).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("at 10am, also reminds people who signed up but never created a store", async () => {
    vi.mocked(adminAuth.listUsers).mockResolvedValue({
      users: [
        { uid: "u-new", email: "new@example.com", displayName: "Tunde", disabled: false, metadata: { creationTime: daysAgo(3.2, TEN_AM_LAGOS).toUTCString() } },
        { uid: "u-owner", email: "owner@example.com", displayName: "Owner", disabled: false, metadata: { creationTime: daysAgo(3.2, TEN_AM_LAGOS).toUTCString() } },
        { uid: "u-today", email: "today@example.com", displayName: "Today", disabled: false, metadata: { creationTime: TEN_AM_LAGOS.toUTCString() } },
      ],
      pageToken: undefined,
    } as never);
    vi.mocked(query).mockImplementation(async (sql: unknown) => {
      const s = String(sql);
      if (s.includes("FROM stores s")) return [] as never;
      if (s.includes("UNION SELECT")) return [{ uid: "u-owner" }] as never;
      if (s.includes("INSERT INTO setup_reminders")) return [{ subject: "x" }] as never;
      return [] as never;
    });
    const res = await sendDueSetupReminders({ enabled: true, now: TEN_AM_LAGOS });
    expect(res.signups).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith("new@example.com", expect.any(String), expect.stringContaining("/onboarding"));
  });
});
