import { after, NextRequest, NextResponse } from "next/server";
import { webhookReady, webhookVerifyToken } from "@/lib/meta/config";
import { verifyMetaSignature } from "@/lib/meta/crypto";
import { processWhatsAppWebhook } from "@/lib/meta/inbound";

export const dynamic = "force-dynamic";

// Meta webhook: https://dukanigeria.com/api/meta/webhook
//   GET   Meta's one-time check when you save the webhook (hub.challenge)
//   POST  incoming WhatsApp messages, signed with the app secret
// Without META_APP_SECRET / META_WEBHOOK_VERIFY_TOKEN this route doesn't exist (404).

export async function GET(req: NextRequest) {
  if (!webhookReady()) return new NextResponse("Not found", { status: 404 });
  const sp = req.nextUrl.searchParams;
  if (sp.get("hub.mode") === "subscribe" && sp.get("hub.verify_token") === webhookVerifyToken()) {
    return new NextResponse(sp.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  if (!webhookReady()) return new NextResponse("Not found", { status: 404 });
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }
  // Answer Meta straight away; reply to the shopper after the response
  after(() => processWhatsAppWebhook(payload).then(() => undefined, (e) => console.error("[meta webhook]", e)));
  return NextResponse.json({ ok: true });
}
