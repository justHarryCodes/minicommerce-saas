import { NextRequest, NextResponse } from "next/server";
import { createDeletionRequest, parseSignedRequest } from "@/lib/data-deletion";
import { sendWebPushToAllAdmins } from "@/lib/webpush";
import { getAppUrl } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// Meta's "Data deletion callback URL" (App settings -> Basic). Meta POSTs here
// with a signed_request when someone removes Duka from their Facebook /
// Instagram settings. We log a request against their app-scoped user ID and
// answer with a status link and code, which Meta shows to the person.
//
// Once WhatsApp / Instagram connections are stored, completing the request
// means deleting the rows (tokens, messages) for that meta_user_id.

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const signed = form?.get("signed_request");
  const payload = typeof signed === "string" ? parseSignedRequest(signed, process.env.META_APP_SECRET ?? "") : null;
  if (!payload) return NextResponse.json({ error: "Invalid signed_request" }, { status: 400 });

  const code = await createDeletionRequest({ source: "meta", metaUserId: payload.user_id });
  sendWebPushToAllAdmins({ title: "🗑️ Data deletion request (Meta)", body: `${code} · removed Duka from Facebook/Instagram`, url: "/admin/data-requests" }).catch(() => {});

  return NextResponse.json({ url: `${getAppUrl()}/data-deletion?code=${code}`, confirmation_code: code });
}
