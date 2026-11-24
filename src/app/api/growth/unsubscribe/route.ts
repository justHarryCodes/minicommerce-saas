import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { verifyGrowthUnsub, esc } from "@/lib/growth-emails";
import { unsubscribeEmail } from "@/lib/growth-automations";

export const dynamic = "force-dynamic";

// "Stop emails from <store>" in growth follow-ups. The link is signed, so
// nobody can unsubscribe someone else.
function page(title: string, text: string, status = 200) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fafafa;font-family:system-ui,sans-serif;color:#18181b">
<div style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:20px;margin:0 0 8px">${esc(title)}</h1>
<p style="color:#71717a;margin:0;line-height:1.5">${esc(text)}</p></div></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

function signed(req: NextRequest): { storeId: string; email: string } | null {
  const storeId = req.nextUrl.searchParams.get("s") ?? "";
  const email = (req.nextUrl.searchParams.get("e") ?? "").trim().toLowerCase();
  const token = req.nextUrl.searchParams.get("t") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(storeId) || !email.includes("@") || email.length > 200) return null;
  return verifyGrowthUnsub(storeId, email, token) ? { storeId, email } : null;
}

export async function GET(req: NextRequest) {
  const s = signed(req);
  if (!s) return page("This link doesn't work", "It may be incomplete. Copy the full link from the email and try again.", 400);
  await unsubscribeEmail(s.storeId, s.email);
  const store = await queryOne<{ name: string }>("SELECT name FROM stores WHERE id = $1", [s.storeId]).catch(() => null);
  const name = store?.name ?? "this store";
  return page(`You won't get emails from ${name} any more`, "You'll still get messages about orders you place.");
}

/** One-click unsubscribe (RFC 8058): Gmail / Yahoo's own "Unsubscribe" button posts here. */
export async function POST(req: NextRequest) {
  const s = signed(req);
  if (!s) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  await unsubscribeEmail(s.storeId, s.email);
  return NextResponse.json({ ok: true });
}
