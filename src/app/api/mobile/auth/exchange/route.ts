import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { redeemHandoffCode } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

// Step 3 of app Google sign-in (see lib/mobile-auth.ts): the app swaps the
// one-time code for a Firebase custom token and signs in with it.
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, { key: "rl:mobile-auth-exchange", max: 20, window: 600 });
  if (limited) return limited;

  const { code } = (await req.json().catch(() => ({}))) as { code?: unknown };
  const uid = typeof code === "string" ? await redeemHandoffCode(code) : null;
  if (!uid) return NextResponse.json({ error: "This sign-in link has expired. Please try again." }, { status: 400 });

  try {
    const user = await adminAuth.getUser(uid);
    if (user.disabled) return NextResponse.json({ error: "This account has been disabled." }, { status: 403 });
    const token = await adminAuth.createCustomToken(uid);
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Couldn't finish signing in. Please try again." }, { status: 500 });
  }
}
