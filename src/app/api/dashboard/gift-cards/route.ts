import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/plan";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { query, withTransaction } from "@/lib/db";
import { generateGiftCode, type GiftCardRow } from "@/lib/gift-cards";
import { sendEmail, sendSms } from "@/lib/notify/providers";
import { toNgInternational } from "@/lib/phone";
import { getStoreUrl, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "giftcards");
  if (!store) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const denied = await requireFeature(store.id, "gift_cards");
  if (denied) return denied;
  const cards = await query<GiftCardRow>(
    "SELECT * FROM gift_cards WHERE store_id = $1 ORDER BY created_at DESC LIMIT 500",
    [store.id]
  );
  return NextResponse.json({ cards });
}

const IssueSchema = z.object({
  kind: z.enum(["gift_card", "store_credit"]),
  amount: z.number().int().min(100).max(10_000_000),
  recipientName: z.string().trim().max(120).optional().nullable(),
  recipientPhone: z.string().trim().max(30).optional().nullable(),
  recipientEmail: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  note: z.string().trim().max(300).optional().nullable(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("")),
  notify: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "giftcards");
  if (!store) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const denied = await requireFeature(store.id, "gift_cards");
  if (denied) return denied;

  const parsed = IssueSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the amount and details" }, { status: 422 });
  }
  const d = parsed.data;
  if (d.kind === "store_credit" && !d.recipientPhone && !d.recipientEmail) {
    return NextResponse.json({ error: "Store credit needs the customer's phone or email" }, { status: 422 });
  }

  // Retry on the (very unlikely) code collision
  let card: GiftCardRow | null = null;
  for (let attempt = 0; attempt < 3 && !card; attempt++) {
    try {
      card = await withTransaction(async (client) => {
        const res = await client.query<GiftCardRow>(
          `INSERT INTO gift_cards (store_id, code, kind, initial_amount, balance, recipient_name, recipient_phone,
                                   recipient_email, note, expires_at, created_by)
           VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [
            store.id, generateGiftCode(), d.kind, d.amount, d.recipientName || null, d.recipientPhone || null,
            d.recipientEmail || null, d.note || null, d.expiresAt || null, user.firebaseUid,
          ]
        );
        const c = res.rows[0];
        await client.query(
          `INSERT INTO gift_card_ledger (gift_card_id, change, balance_after, reason) VALUES ($1, $2, $2, 'issued')`,
          [c.id, d.amount]
        );
        return c;
      });
    } catch (err) {
      if ((err as { code?: string }).code !== "23505") throw err;
    }
  }
  if (!card) return NextResponse.json({ error: "Couldn't create a code — try again" }, { status: 500 });

  // Optionally tell the recipient (SMS and/or email, whichever is set up)
  let notified = false;
  if (d.notify) {
    const shop = getStoreUrl(store.slug, store.customDomain ?? store.custom_domain ?? null);
    const what = d.kind === "store_credit" ? "store credit" : "a gift card";
    const text = `${store.name}: you have ${what} worth ${formatCurrency(d.amount)}. Use code ${card.code} at checkout: ${shop}`;
    const phone = toNgInternational(d.recipientPhone);
    if (phone) notified = (await sendSms(phone, text)).ok || notified;
    if (d.recipientEmail) {
      const r = await sendEmail(
        d.recipientEmail,
        `${formatCurrency(d.amount)} ${d.kind === "store_credit" ? "store credit" : "gift card"} from ${store.name}`,
        `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
          <h2 style="margin:0 0 8px">${escapeHtml(store.name)}</h2>
          <p>You have ${what} worth <strong>${formatCurrency(d.amount)}</strong>.</p>
          <p style="font-size:22px;font-weight:700;letter-spacing:2px;font-family:monospace;background:#f4f4f5;padding:14px;border-radius:10px;text-align:center">${card.code}</p>
          <p>Enter this code at checkout. <a href="${shop}">Shop now →</a></p>
        </div>`
      );
      notified = r.ok || notified;
    }
  }

  return NextResponse.json({ card, notified }, { status: 201 });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
