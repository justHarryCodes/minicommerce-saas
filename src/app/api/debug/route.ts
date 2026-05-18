import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") ?? "(none)";
  const xForwardedHost = req.headers.get("x-forwarded-host") ?? "(none)";
  const xRealIp = req.headers.get("x-real-ip") ?? "(none)";
  const xForwardedFor = req.headers.get("x-forwarded-for") ?? "(none)";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "awarizon.shop";

  const hostname = (xForwardedHost !== "(none)" ? xForwardedHost : host)
    .split(":")[0]
    .toLowerCase();

  const isSubdomain =
    hostname.endsWith(`.${rootDomain}`) &&
    !hostname.startsWith("www.") &&
    !hostname.startsWith("localhost");

  const subdomain = isSubdomain
    ? hostname.slice(0, hostname.length - rootDomain.length - 1)
    : null;

  return NextResponse.json({
    host,
    xForwardedHost,
    xRealIp,
    xForwardedFor,
    rootDomain,
    hostname,
    isSubdomain,
    subdomain,
  });
}
