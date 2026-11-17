import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { createHandoffCode } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

// Step 2 of app Google sign-in (see lib/mobile-auth.ts): the website, just
// signed in with Google, swaps its Firebase ID token for a one-time code.
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, { key: "rl:mobile-auth-handoff", max: 20, window: 600 });
  if (limited) return limited;

  const { idToken } = (await req.json().catch(() => ({}))) as { idToken?: unknown };
  if (typeof idToken !== "string" || idToken.length < 100) {
    return NextResponse.json({ error: "Sign in first" }, { status: 400 });
  }
  try {
    // checkRevoked: a signed-out or disabled account can't hand off
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const code = await createHandoffCode(decoded.uid);
    return NextResponse.json({ code });
  } catch {
    return NextResponse.json({ error: "Your sign-in expired. Please try again." }, { status: 401 });
  }
}
