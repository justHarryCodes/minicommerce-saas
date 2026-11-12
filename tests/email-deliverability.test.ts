import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/paystack", () => ({ getAppUrl: () => "https://dukanigeria.com" }));

import { query, queryOne } from "@/lib/db";
import { htmlToText, sendEmail } from "@/lib/notify/providers";
import { verifySvix } from "@/lib/notify/svix";
import { POST as resendWebhook } from "@/app/api/resend/webhook/route";
import { buildStoreReminder, isSetUp, missingTasks } from "@/lib/notify/setup-reminders";

// Keeping Duka's email out of spam: plain-text copies, one-click unsubscribe
// headers, and never emailing addresses that bounced or complained.

const fetchMock = vi.fn();
beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Duka <hello@dukanigeria.com>";
  delete process.env.EMAIL_REPLY_TO;
  fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(query).mockReset().mockResolvedValue([] as never);
  vi.mocked(queryOne).mockReset().mockResolvedValue(null);
});

const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body as string);

describe("every email", () => {
  it("goes out with a plain-text copy", async () => {
    await sendEmail("a@b.co", "Hi", `<p>Hello <b>Amaka</b></p><p><a href="https://dukanigeria.com/x">Add a product</a></p>`);
    expect(sentBody().text).toBe("Hello Amaka\nAdd a product (https://dukanigeria.com/x)");
  });

  it("is skipped for an address that bounced or complained", async () => {
    vi.mocked(queryOne).mockResolvedValue({ "?column?": 1 } as never);
    const r = await sendEmail("dead@b.co", "Hi", "<p>x</p>");
    expect(r.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("replies go to EMAIL_REPLY_TO when set", async () => {
    process.env.EMAIL_REPLY_TO = "support@dukanigeria.com";
    await sendEmail("a@b.co", "Hi", "<p>x</p>");
    expect(sentBody().reply_to).toBe("support@dukanigeria.com");
  });
});

describe("reminder emails", () => {
  it("carry one-click unsubscribe headers (Gmail / Yahoo)", async () => {
    await sendEmail("a@b.co", "Hi", "<p>x</p>", undefined, { unsubscribeUrl: "https://dukanigeria.com/api/reminders/unsubscribe?s=store:1&t=x" });
    expect(sentBody().headers).toEqual({
      "List-Unsubscribe": "<https://dukanigeria.com/api/reminders/unsubscribe?s=store:1&t=x>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("order emails don't (they're transactional)", async () => {
    await sendEmail("a@b.co", "Your order", "<p>x</p>");
    expect(sentBody().headers).toBeUndefined();
  });

  it("text version of a real reminder is readable", () => {
    const m = buildStoreReminder({ step: 1, storeName: "Amaka", missing: ["products"], appUrl: "https://dukanigeria.com", unsubscribeUrl: "https://u" });
    const text = htmlToText(m.html);
    expect(text).toContain("Add your first products");
    expect(text).toContain("https://dukanigeria.com/dashboard/products/new");
    expect(text).not.toMatch(/<|&amp;|style=/);
  });
});

describe("stores with one product", () => {
  it("still need finishing, and are asked to add more", () => {
    expect(isSetUp({ products: 1, hasPayout: true, hasLogo: true })).toBe(false);
    expect(missingTasks({ products: 1, hasPayout: true, hasLogo: true })).toEqual(["more_products"]);
    expect(isSetUp({ products: 2, hasPayout: true, hasLogo: false })).toBe(true);
    const m = buildStoreReminder({ step: 1, storeName: "Amaka", missing: ["more_products"], appUrl: "https://d", unsubscribeUrl: "u" });
    expect(m.html).toContain("Add a few more products");
    expect(m.pushTitle).toMatch(/more products/);
  });
});

describe("Resend bounce / spam webhook", () => {
  const SECRET = "whsec_" + Buffer.from("super-secret-key").toString("base64");
  const sign = (id: string, ts: string, body: string) =>
    "v1," + crypto.createHmac("sha256", Buffer.from("super-secret-key")).update(`${id}.${ts}.${body}`).digest("base64");

  it("verifies Resend's signature and rejects stale or forged ones", () => {
    const now = Date.now();
    const ts = String(Math.floor(now / 1000));
    expect(verifySvix(SECRET, "msg_1", ts, "{}", sign("msg_1", ts, "{}"), now)).toBe(true);
    expect(verifySvix(SECRET, "msg_1", ts, "{}", sign("msg_1", ts, '{"x":1}'), now)).toBe(false);
    const old = String(Math.floor(now / 1000) - 3600);
    expect(verifySvix(SECRET, "msg_1", old, "{}", sign("msg_1", old, "{}"), now)).toBe(false);
  });

  async function deliver(event: unknown, signed = true) {
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
    const body = JSON.stringify(event);
    const ts = String(Math.floor(Date.now() / 1000));
    return resendWebhook(
      new NextRequest("https://dukanigeria.com/api/resend/webhook", {
        method: "POST",
        body,
        headers: { "svix-id": "msg_9", "svix-timestamp": ts, "svix-signature": signed ? sign("msg_9", ts, body) : "v1,AAAA" },
      }),
    );
  }
  const suppressions = () => vi.mocked(query).mock.calls.filter(([s]) => String(s).includes("INSERT INTO email_suppressions"));

  it("stops emailing an address that hard-bounced or complained", async () => {
    expect((await deliver({ type: "email.bounced", data: { to: ["Dead@Example.com"], bounce: { type: "Permanent" } } })).status).toBe(200);
    expect(suppressions()[0][1]).toEqual(["dead@example.com", "bounced"]);
    await deliver({ type: "email.complained", data: { to: ["angry@example.com"] } });
    expect(suppressions()[1][1]).toEqual(["angry@example.com", "complained"]);
  });

  it("ignores temporary bounces and unsigned calls", async () => {
    await deliver({ type: "email.bounced", data: { to: ["full@example.com"], bounce: { type: "Transient" } } });
    expect(suppressions()).toHaveLength(0);
    expect((await deliver({ type: "email.complained", data: { to: ["x@y.co"] } }, false)).status).toBe(401);
    expect(suppressions()).toHaveLength(0);
  });
});
