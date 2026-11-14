import { after, NextRequest, NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { whatsappAddonActive } from "@/lib/meta/addon";
import { getAppUrl } from "@/lib/paystack";
import { hostedSignupUrl, webhookReady } from "@/lib/meta/config";
import { discoverAccount, exchangeCode, onboard, readSignupState } from "@/lib/meta/connect";

export const dynamic = "force-dynamic";

// Redirect URI for Meta-hosted Embedded Signup:
//   https://dukanigeria.com/api/meta/es-callback?code=...&state=...
// Which store: the signed "state" Duka adds to the link (WhatsApp shop page), or
// else whoever is signed in to Duka in this browser. Then the same steps as
// the popup: code -> token, find the WhatsApp account + number, link to our
// webhook, register, save, first catalog sync. Always ends on /dashboard/whatsapp.

const back = (status: string, message?: string) => {
  const u = new URL("/dashboard/whatsapp", getAppUrl());
  u.searchParams.set("whatsapp", status);
  if (message) u.searchParams.set("message", message.slice(0, 200));
  return NextResponse.redirect(u, 303);
};

export async function GET(req: NextRequest) {
  if (!hostedSignupUrl() || !webhookReady()) return new NextResponse("Not found", { status: 404 });
  const sp = req.nextUrl.searchParams;
  if (sp.get("error")) return back("cancelled", sp.get("error_description") ?? "Signup was cancelled");
  const code = sp.get("code");
  if (!code) return back("error", "Meta didn't send a signup code. Please try again.");

  let storeId = readSignupState(sp.get("state"));
  if (!storeId) {
    const user = await verifySession().catch(() => null);
    const store = user ? await getUserStore(user.firebaseUid).catch(() => null) : null;
    storeId = store?.id ?? null;
  }
  if (!storeId) return back("error", "Open the link from Dashboard -> Channels while signed in to Duka.");
  if (!(await whatsappAddonActive(storeId))) return back("error", "The WhatsApp shop add-on isn't active for your store.");

  // The code must be exchanged with exactly the redirect URI Meta used
  const redirectUri = `${getAppUrl()}/api/meta/es-callback`;
  const tok = await exchangeCode(code, redirectUri);
  if (!tok.ok || !tok.data.access_token) return back("error", tok.ok ? "Meta didn't return a token" : tok.error);
  const token = tok.data.access_token;

  const ids = sp.get("waba_id") && sp.get("phone_number_id")
    ? { wabaId: sp.get("waba_id")!, phoneNumberId: sp.get("phone_number_id")! }
    : await discoverAccount(token);
  if (!ids) return back("error", "No WhatsApp number was shared. Run the signup again and pick a phone number.");

  const done = await onboard(storeId, token, ids);
  if (!done.ok) return back("error", done.error);

  const sid = storeId;
  after(async () => {
    const { syncStoreCatalog } = await import("@/lib/meta/catalog");
    await syncStoreCatalog(sid).catch((e) => console.error("[catalog] first sync failed:", e));
  });
  return back("connected");
}
