import { NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { getEffectivePlan } from "@/lib/plan";
import { isAiEnabled } from "@/lib/ai";

// Dashboard components call this once to decide whether to render AI-assist
// buttons at all, rather than rendering them and failing loudly.
//
// `groq`/`gemini` here mean "backend configured" only — they used to be the
// *entire* signal a component checked before showing a Pro-gated AI button
// (product-description, suggest-category both call requirePro()). A Free
// merchant would see and click a live-looking "AI-assist" button, the
// request would 403, and — because of a separate bug in how that error got
// displayed (see ProductForm.tsx) — see a generic "AI generation failed"
// toast with no indication it was a plan limit at all. That combination is
// almost certainly what "the AI doesn't work" reports were actually hitting
// for any merchant not on Pro. `isPro` is now included so callers can show
// a locked/upgrade state for Pro-gated features instead of a button that
// silently fails for most merchants.
export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getUserStore(user.firebaseUid);
  // No store yet (mid-onboarding) — nothing here is Pro-gated at that point
  // (suggest-store-structure is free for everyone), so isPro is moot; false
  // is the safe default rather than pretending Pro access exists.
  const isPro = store ? (await getEffectivePlan(store.id)).isPro : false;

  return NextResponse.json({ ...isAiEnabled(), isPro });
}
