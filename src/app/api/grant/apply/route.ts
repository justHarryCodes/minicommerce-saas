import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { applyForGrant } from "@/lib/grants";

export const dynamic = "force-dynamic";

// Duka Vendor Grant application (no login). Checks the store exists, has
// enough live products and that the email is the store owner's, then emails
// a confirmation link: the application only counts once that's clicked.
const Body = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email address").max(160),
  storeLink: z.string().trim().min(2, "Paste your store link").max(300),
  story: z.string().trim().max(600).optional().nullable(),
  agree: z.literal(true, { errorMap: () => ({ message: "Please accept the terms and conditions" }) }),
  /** Honeypot: people never fill this in */
  website: z.string().max(0).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, { key: "grant-apply", max: 6, window: 3600, message: "Too many tries. Please wait a little and try again." });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your details" }, { status: 422 });
  // The same email can't be used to flood the confirmation inbox
  const perEmail = await checkRateLimit(req, { key: `grant-email:${parsed.data.email.toLowerCase()}`, max: 3, window: 3600, message: "We've already sent a few emails to this address. Check your inbox (and spam folder)." });
  if (perEmail) return perEmail;

  const r = await applyForGrant(parsed.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r);
}
