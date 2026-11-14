import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminSession, logAdminAction } from "@/lib/admin-auth";
import { deleteVendorAccount, getDeletionRequestFull, isFinal, normaliseCode, setDeletionStatus } from "@/lib/data-deletion";
import { sendEmail } from "@/lib/notify/providers";
import { emailHeader } from "@/lib/notify/email-brand";
import { esc } from "@/lib/notify/setup-reminders";

export const dynamic = "force-dynamic";

// Admin -> Data requests: move a deletion request along.
//   start         someone is on it (In progress)
//   delete_store  wipe the matched vendor's account, then complete
//   complete      done by hand (e.g. a shopper's details removed from orders)
//   reject        couldn't confirm it's really them
const Schema = z.object({
  action: z.enum(["start", "delete_store", "complete", "reject"]),
  storeId: z.string().uuid().optional(),
  note: z.string().trim().max(1000).optional(),
});

const shell = (inner: string) =>
  `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#18181b;max-width:520px">${emailHeader()}${inner}</div>`;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const admin = await verifyAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const code = normaliseCode((await params).code);
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!code || !parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  const { action, storeId, note } = parsed.data;

  const r = await getDeletionRequestFull(code);
  if (!r) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (isFinal(r.status)) return NextResponse.json({ error: `Already ${r.status}` }, { status: 409 });

  if (action === "reject" && !note) return NextResponse.json({ error: "Add a short reason" }, { status: 422 });

  let deletedSlug: string | undefined;
  if (action === "delete_store") {
    if (!storeId) return NextResponse.json({ error: "No store to delete" }, { status: 422 });
    const res = await deleteVendorAccount(storeId);
    if (!res.ok) return NextResponse.json({ error: "Store not found" }, { status: 404 });
    deletedSlug = res.slug;
  }

  const status = action === "start" ? "in_progress" : action === "reject" ? "rejected" : "completed";
  const autoNote = deletedSlug ? `Deleted store ${deletedSlug}${note ? `. ${note}` : ""}` : note;
  const moved = await setDeletionStatus(code, status, admin.email, autoNote ?? null);
  if (!moved) return NextResponse.json({ error: "Someone else already closed this request" }, { status: 409 });

  await logAdminAction({
    adminUid: admin.firebaseUid,
    adminEmail: admin.email,
    action: `data_deletion_${action}`,
    targetType: deletedSlug ? "store" : "data_deletion_request",
    targetId: deletedSlug ? storeId : code,
    details: { code, note: autoNote ?? null },
  }).catch(() => {});

  // Let the person know when it's finished (Meta requests have no email: they check the status page)
  if (r.email && status === "completed") {
    await sendEmail(
      r.email,
      `Your data has been deleted (${code})`,
      shell(`<p style="margin:0 0 12px;font-size:15px;line-height:1.6">We've finished your data deletion request <strong>${code}</strong>. Your personal data has been removed from Duka.</p>
<p style="margin:0;font-size:14px;line-height:1.6;color:#52525b">Records of completed sales and payments are kept only where the law requires, with personal details removed where possible.</p>`),
    ).catch(() => null);
  }
  if (r.email && status === "rejected") {
    await sendEmail(
      r.email,
      `About your data deletion request (${code})`,
      shell(`<p style="margin:0 0 12px;font-size:15px;line-height:1.6">We couldn't complete your data deletion request <strong>${code}</strong>.</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${esc(note!)}</p>
<p style="margin:0;font-size:14px;color:#52525b">Reply to this email if you'd like to try again.</p>`),
    ).catch(() => null);
  }

  return NextResponse.json({ ok: true, status });
}
