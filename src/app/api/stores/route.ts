import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { query, queryOne, toCamel } from "@/lib/db";
import { ensureUncategorized } from "@/lib/categories";
import { z } from "zod";

const RESERVED_SLUGS = new Set([
  "api",
  "www",
  "store",
  "admin",
  "dashboard",
  "auth",
  "onboarding",
  "login",
  "logout",
  "signup",
  "register",
  "checkout",
  "account",
  "settings",
  "profile",
  "help",
  "support",
  "about",
  "terms",
  "privacy",
  "static",
  "public",
  "assets",
  "images",
  "media",
  "uploads",
]);

const FIELD_LABELS: Record<string, string> = {
  name: "Store name",
  slug: "Store link",
  description: "Description",
  phone: "Phone number",
  whatsapp: "WhatsApp number",
  bankName: "Bank name",
  bankAccountNumber: "Account number",
  accountNumber: "Account number",
  bankAccountName: "Account name",
  accountName: "Account name",
};

const CreateStoreSchema = z.object({
  name: z.string().trim().min(2, "must be at least 2 characters").max(100, "must be 100 characters or less"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "must be at least 2 characters")
    .max(60, "must be 60 characters or less")
    .regex(/^[a-z0-9-]+$/, "can only use letters, numbers and dashes"),
  description: z.string().trim().max(1000, "must be 1,000 characters or less").optional(),
  logoUrl: z.string().optional().or(z.literal("")),
  phone: z.string().trim().max(30, "is too long").optional(),
  whatsapp: z.string().trim().max(30, "is too long").optional(),
  primaryCategory: z.string().optional(),
  // Accept either paymentMethods array (legacy) or paymentPreference string
  paymentMethods: z.array(z.string()).optional(),
  paymentPreference: z.enum(["paystack", "bank_transfer", "both"]).optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(), // legacy key
  accountName: z.string().optional(), // legacy key
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  // A malformed referral code (e.g. a mangled share link) is ignored, never a reason to fail signup
  referralCode: z.string().trim().max(20).optional().nullable().catch(null),
});

function derivePaymentPreference(
  methods?: string[],
  preference?: string,
): "paystack" | "bank_transfer" | "both" {
  if (
    preference &&
    ["paystack", "bank_transfer", "both"].includes(preference)
  ) {
    return preference as "paystack" | "bank_transfer" | "both";
  }
  if (!methods || methods.length === 0) return "both";
  const hasPaystack = methods.includes("paystack");
  const hasTransfer =
    methods.includes("transfer") || methods.includes("bank_transfer");
  if (hasPaystack && hasTransfer) return "both";
  if (hasPaystack) return "paystack";
  if (hasTransfer) return "bank_transfer";
  return "both";
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await queryOne(
      "SELECT id FROM stores WHERE owner_id = $1",
      [user.firebaseUid],
    );
    if (existing)
      return NextResponse.json(
        { error: "Store already exists" },
        { status: 409 },
      );

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const parsed = CreateStoreSchema.safeParse(body);
    if (!parsed.success) {
      // A sentence the onboarding form can show as-is (it used to get an
      // object here and could only say "Failed to create store").
      const issue = parsed.error.issues[0];
      const field = String(issue?.path[0] ?? "");
      const message = issue ? `${FIELD_LABELS[field] ?? field} ${issue.message}`.trim() : "Some details are invalid";
      console.warn("[POST /api/stores] validation failed", parsed.error.flatten().fieldErrors);
      return NextResponse.json({ error: message, fields: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const d = parsed.data;
    if (RESERVED_SLUGS.has(d.slug))
      return NextResponse.json(
        { error: "Slug already taken" },
        { status: 409 },
      );

    const slugConflict = await queryOne(
      "SELECT id FROM stores WHERE slug = $1",
      [d.slug],
    );
    if (slugConflict)
      return NextResponse.json(
        { error: "Slug already taken" },
        { status: 409 },
      );

    const paymentPreference = derivePaymentPreference(
      d.paymentMethods,
      d.paymentPreference,
    );
    const bankAccountNumber = d.bankAccountNumber || d.accountNumber || null;
    const bankAccountName = d.bankAccountName || d.accountName || null;

    // Auto-grant the Free plan so vendors can start selling immediately, no payment
    const freePlan = await queryOne<{ id: string }>(
      `SELECT id FROM plans WHERE price_monthly = 0 AND is_active = true ORDER BY sort_order LIMIT 1`,
      [],
    );

    // Resolve referral code — check vendor stores first, then affiliates.
    // Non-fatal: a bad lookup should never stop someone from opening a store.
    let referredByStoreId: string | null = null;
    let referredByAffiliateId: string | null = null;
    if (d.referralCode) {
      try {
        const upperCode = d.referralCode.toUpperCase();
        const referrerStore = await queryOne<{ id: string }>(
          "SELECT id FROM stores WHERE referral_code = $1",
          [upperCode],
        );
        if (referrerStore) {
          referredByStoreId = referrerStore.id;
        } else {
          const referrerAffiliate = await queryOne<{ id: string }>(
            "SELECT id FROM affiliates WHERE referral_code = $1 AND is_active = true",
            [upperCode],
          );
          if (referrerAffiliate) referredByAffiliateId = referrerAffiliate.id;
        }
      } catch (err) {
        console.error(
          "[POST /api/stores] referral lookup failed (continuing)",
          err,
        );
      }
    }

    const rows = await query(
      `
      INSERT INTO stores (
        owner_id, name, slug, description, logo_url, phone, whatsapp,
        primary_category, payment_preference, bank_name, bank_account_number, bank_account_name,
        referred_by_store_id, referred_by_affiliate_id,
        current_plan_id, plan_expires_at,
        referral_code
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
        UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FROM 1 FOR 8))
      )
      RETURNING *
    `,
      [
        user.firebaseUid,
        d.name,
        d.slug,
        d.description || null,
        d.logoUrl || null,
        d.phone || null,
        d.whatsapp || null,
        d.primaryCategory || "other",
        paymentPreference,
        d.bankName || null,
        bankAccountNumber,
        bankAccountName,
        referredByStoreId,
        referredByAffiliateId,
        freePlan?.id ?? null,
        freePlan
          ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      ],
    );

    const newStore = rows[0] as Record<string, unknown>;

    // ── Everything below is secondary. The store already exists, so none of
    // these steps may turn a successful creation into an error response. ──

    // Seed the default Uncategorized category for the new store
    try {
      await ensureUncategorized(newStore.id as string);
    } catch (err) {
      console.error(
        "[POST /api/stores] ensureUncategorized failed (continuing)",
        newStore.id,
        err,
      );
    }

    // Record vendor-to-vendor referral (rewarded later when setup fee is paid)
    if (referredByStoreId) {
      try {
        await query(
          `INSERT INTO referrals (referrer_store_id, referred_store_id, status)
           VALUES ($1, $2, 'signed_up')
           ON CONFLICT DO NOTHING`,
          [referredByStoreId, newStore.id],
        );
      } catch (err) {
        console.error(
          "[POST /api/stores] store referral insert failed (continuing)",
          newStore.id,
          err,
        );
      }
    }

    // Record affiliate referral (rewarded later when setup fee is paid)
    if (referredByAffiliateId) {
      try {
        await query(
          `INSERT INTO affiliate_referrals (affiliate_id, store_id, status)
           VALUES ($1, $2, 'pending')
           ON CONFLICT DO NOTHING`,
          [referredByAffiliateId, newStore.id],
        );
        await query(
          "UPDATE affiliates SET total_referrals = total_referrals + 1, updated_at = NOW() WHERE id = $1",
          [referredByAffiliateId],
        );
      } catch (err) {
        console.error(
          "[POST /api/stores] affiliate referral failed (continuing)",
          newStore.id,
          err,
        );
      }
    }

    return NextResponse.json({ data: toCamel(newStore) }, { status: 201 });
  } catch (err: unknown) {
    const e = err as {
      message?: string;
      code?: string;
      detail?: string;
      constraint?: string;
      column?: string;
      table?: string;
    };
    // Two taps on "Create store" race each other: the loser hits a unique
    // rule. Say what actually happened instead of a generic failure.
    if (e?.code === "23505") {
      const taken = e.constraint === "stores_slug_key";
      return NextResponse.json(
        { error: taken ? "That store link was just taken — try another" : "Store already exists" },
        { status: 409 },
      );
    }
    console.error("[POST /api/stores] FAILED", e);
    return NextResponse.json(
      {
        error: "Failed to create store",
        // TEMPORARY: remove this `debug` block once the cause is found.
        debug: {
          message: e?.message,
          code: e?.code,
          detail: e?.detail,
          constraint: e?.constraint,
          column: e?.column,
          table: e?.table,
        },
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const user = await verifySession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await queryOne("SELECT * FROM stores WHERE owner_id = $1", [
    user.firebaseUid,
  ]);
  if (!row) return NextResponse.json({ data: null });
  return NextResponse.json({ data: toCamel(row as Record<string, unknown>) });
}
