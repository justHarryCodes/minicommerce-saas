import { readFileSync } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ one: [] as unknown[], sql: [] as { sql: string; params: unknown[] }[], sent: [] as { to: string; html: string }[] }));
vi.mock("@/lib/db", () => ({
  queryOne: vi.fn(async (sql: string, params: unknown[] = []) => {
    h.sql.push({ sql, params });
    return h.one.length ? h.one.shift() : null;
  }),
  query: vi.fn(async (sql: string, params: unknown[] = []) => {
    h.sql.push({ sql, params });
    return [];
  }),
}));
vi.mock("@/lib/notify/providers", () => ({
  emailConfigured: () => true,
  sendEmail: vi.fn(async (to: string, _s: string, html: string) => {
    h.sent.push({ to, html });
    return { ok: true };
  }),
}));
vi.mock("@/lib/firebase-admin", () => ({ adminAuth: { getUser: vi.fn(async () => ({ email: "owner@login.com" })) } }));

import { GRANT_STATEMENTS, applyForGrant, maskEmail, parseStoreLink, roundAcceptsApplications, verifyGrantApplication } from "@/lib/grants";

const OPEN = { id: "r1", title: "December 2026", amount: 50000, min_products: 30, is_open: true, closes_at: new Date(Date.now() + 86400000).toISOString(), created_at: "" };
const STORE = { id: "s1", slug: "kemi", name: "Kemi's Closet", owner_id: "u1", owner_email: "kemi@shop.ng", email: null, custom_domain: null };
const READY = { products: 30, logo: true, about: true, contact: true, paid: true };
const form = { name: "Kemi Ade", email: "kemi@shop.ng", storeLink: "https://kemi.dukanigeria.com/products/x" };

beforeEach(() => {
  h.one = [];
  h.sql = [];
  h.sent = [];
});

describe("store links", () => {
  it("understands what people paste", () => {
    expect(parseStoreLink("kemi", "dukanigeria.com")).toEqual({ slug: "kemi" });
    expect(parseStoreLink("https://kemi.dukanigeria.com/products/bag", "dukanigeria.com")).toEqual({ slug: "kemi" });
    expect(parseStoreLink("www.dukanigeria.com/store/kemi", "dukanigeria.com")).toEqual({ slug: "kemi" });
    expect(parseStoreLink("shop.kemi.com", "dukanigeria.com")).toEqual({ domain: "shop.kemi.com" });
    expect(parseStoreLink("https://dukanigeria.com/pricing", "dukanigeria.com")).toBeNull();
    expect(parseStoreLink("   ", "dukanigeria.com")).toBeNull();
  });
  it("rounds take applications only while open and before the countdown ends", () => {
    expect(roundAcceptsApplications(OPEN)).toBe(true);
    expect(roundAcceptsApplications({ ...OPEN, is_open: false })).toBe(false);
    expect(roundAcceptsApplications({ ...OPEN, closes_at: new Date(Date.now() - 1000).toISOString() })).toBe(false);
    expect(roundAcceptsApplications({ ...OPEN, closes_at: null })).toBe(true);
    expect(roundAcceptsApplications(null)).toBe(false);
  });
  it("masks the email it shows back", () => {
    expect(maskEmail("kemi@shop.ng")).toBe("k***@shop.ng");
  });
  it("first-use setup matches migrations/vendor_grants.sql", () => {
    const squash = (s: string) => s.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    const m = squash(readFileSync(join(__dirname, "../migrations/vendor_grants.sql"), "utf8"));
    for (const st of GRANT_STATEMENTS) expect(m).toContain(squash(st));
  });
});

describe("applying", () => {
  it("closed round: refused", async () => {
    h.one = [{ ...OPEN, is_open: false }];
    expect(await applyForGrant(form)).toMatchObject({ ok: false, status: 403 });
  });
  it("unknown store: refused", async () => {
    h.one = [OPEN, null];
    expect(await applyForGrant(form)).toMatchObject({ ok: false, status: 404 });
  });
  it("fewer than 30 different products: refused, with the count", async () => {
    h.one = [OPEN, STORE, { ...READY, products: 12 }];
    const r = await applyForGrant(form);
    expect(r).toMatchObject({ ok: false, status: 422 });
    if (!r.ok) expect(r.error).toMatch(/at least 30 different products with photos \(you have 12\)/);
    expect(h.sent).toEqual([]);
  });
  it("a store that isn't properly set up (no logo, no payment details): refused, saying what's missing", async () => {
    h.one = [OPEN, STORE, { ...READY, logo: false, paid: false }];
    const r = await applyForGrant(form);
    expect(r).toMatchObject({ ok: false, status: 422 });
    if (!r.ok) {
      expect(r.error).toMatch(/business logo/);
      expect(r.error).toMatch(/Duka Pay or bank details/);
    }
  });
  it("duplicates don't count: products are counted by distinct name, with photos", async () => {
    h.one = [OPEN, STORE, READY, null];
    await applyForGrant(form);
    const readiness = h.sql.find((q) => /COUNT\(DISTINCT lower\(trim\(p.name\)\)\)/.test(q.sql));
    expect(readiness?.sql).toMatch(/image_url/);
  });
  it("an email that isn't the store owner's: refused (the store must be theirs)", async () => {
    h.one = [OPEN, STORE, READY];
    const r = await applyForGrant({ ...form, email: "someone@else.com" });
    expect(r).toMatchObject({ ok: false, status: 422 });
    expect(h.sent).toEqual([]);
  });
  it("the owner's login email works too (from their Duka account)", async () => {
    h.one = [OPEN, STORE, READY, null];
    const r = await applyForGrant({ ...form, email: "Owner@Login.com" });
    expect(r).toMatchObject({ ok: true });
  });
  it("owner + properly set up: saved unconfirmed, and a confirmation link is emailed", async () => {
    h.one = [OPEN, STORE, READY, null];
    const r = await applyForGrant(form);
    expect(r).toEqual({ ok: true, maskedEmail: "k***@shop.ng", resent: false });
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0].html).toMatch(/\/grant\/verify\?token=[a-f0-9]{64}/);
    // only a hash of the token is stored
    const insert = h.sql.find((q) => /INSERT INTO grant_applications/.test(q.sql))!;
    const token = h.sent[0].html.match(/token=([a-f0-9]{64})/)![1];
    expect(insert.params).not.toContain(token);
  });
  it("one application per store per round", async () => {
    h.one = [OPEN, STORE, READY, { id: "a1", status: "submitted" }];
    expect(await applyForGrant(form)).toMatchObject({ ok: false, status: 409 });
  });
  it("an unconfirmed application can be sent again (new link)", async () => {
    h.one = [OPEN, STORE, READY, { id: "a1", status: "unverified" }];
    expect(await applyForGrant(form)).toMatchObject({ ok: true, resent: true });
  });
});

describe("confirming", () => {
  const token = "a".repeat(64);
  const app = { id: "a1", store_id: "s1", status: "unverified", token_expires_at: new Date(Date.now() + 3600000).toISOString(), round_id: "r1", name: "Kemi", email: "kemi@shop.ng" };
  it("submits the application when the store is still properly set up", async () => {
    h.one = [app, OPEN, { name: "Kemi's Closet" }, { ...READY, products: 31 }];
    expect(await verifyGrantApplication(token)).toMatchObject({ ok: true, already: false, storeName: "Kemi's Closet" });
    expect(h.sql.some((q) => /SET status = 'submitted'/.test(q.sql))).toBe(true);
  });
  it("products dropped below 30 since applying: not accepted", async () => {
    h.one = [app, OPEN, { name: "Kemi's Closet" }, { ...READY, products: 25 }];
    const r = await verifyGrantApplication(token);
    expect(r.ok).toBe(false);
    expect(h.sql.some((q) => /SET status = 'submitted'/.test(q.sql))).toBe(false);
  });
  it("expired or reused links don't work", async () => {
    h.one = [{ ...app, token_expires_at: new Date(Date.now() - 1000).toISOString() }, OPEN, { name: "Kemi's Closet" }];
    expect((await verifyGrantApplication(token)).ok).toBe(false);
    h.one = [null];
    expect((await verifyGrantApplication(token)).ok).toBe(false);
    expect((await verifyGrantApplication("nope")).ok).toBe(false);
  });
});
