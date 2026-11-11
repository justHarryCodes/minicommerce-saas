import { NextRequest, NextResponse } from "next/server";
import { INVITE_COOKIE } from "@/lib/team";
import { getAppUrl } from "@/lib/paystack"; // public address: behind the proxy req.url is localhost

// Signed-out invitee: remember the invite across sign-in/sign-up, then
// /api/auth/redirect sends them back to /team/join to accept it.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const mode = req.nextUrl.searchParams.get("mode") === "signup" ? "signup" : "login";
  const res = NextResponse.redirect(new URL(`/auth/${mode}`, getAppUrl()));
  if (/^[A-Za-z0-9_-]{10,100}$/.test(token)) {
    res.cookies.set(INVITE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
  }
  return res;
}
