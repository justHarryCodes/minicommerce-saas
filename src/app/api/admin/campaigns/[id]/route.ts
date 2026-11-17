import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { queryOne } from "@/lib/db";
import { ensureCampaignTables } from "@/lib/admin/campaigns";

export const dynamic = "force-dynamic";

// GET: a campaign's progress (the builder polls this while it sends)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await ensureCampaignTables();
  const c = await queryOne(`SELECT id, name, status, audience_size, sent, failed, channels, created_at, finished_at FROM admin_campaigns WHERE id = $1`, [id]);
  return c ? NextResponse.json(c) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
