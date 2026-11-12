import { NextRequest, NextResponse } from "next/server";
import { optOut, verifyUnsubscribe } from "@/lib/notify/setup-reminders";

export const dynamic = "force-dynamic";

// "Stop these reminders" link in setup-reminder emails. The link is signed,
// so nobody can unsubscribe someone else.
function page(title: string, text: string, status = 200) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fafafa;font-family:system-ui,sans-serif;color:#18181b">
<div style="max-width:420px;padding:24px;text-align:center"><p style="font-size:22px;font-weight:900;color:#f59e0b;margin:0 0 12px">Duka</p>
<h1 style="font-size:20px;margin:0 0 8px">${title}</h1><p style="color:#71717a;margin:0 0 20px;line-height:1.5">${text}</p>
<a href="/dashboard" style="font-weight:700;color:#b45309">Go to my dashboard →</a></div></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export async function GET(req: NextRequest) {
  const subject = req.nextUrl.searchParams.get("s") ?? "";
  const token = req.nextUrl.searchParams.get("t") ?? "";
  if (!/^(store|user):[A-Za-z0-9-]{6,128}$/.test(subject) || !verifyUnsubscribe(subject, token)) {
    return page("This link doesn't work", "It may be incomplete. Copy the full link from the email and try again.", 400);
  }
  await optOut(subject);
  return page("You won't get setup reminders any more", "Your store is still here whenever you're ready. Everything you've set up is saved.");
}
