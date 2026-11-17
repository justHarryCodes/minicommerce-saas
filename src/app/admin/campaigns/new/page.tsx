import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";
import CampaignBuilder from "./CampaignBuilder";

export const dynamic = "force-dynamic";
export const metadata = { title: "New campaign" };

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ stores?: string; from?: string; template?: string }> }) {
  const admin = await verifyAdminSession();
  if (!admin) redirect("/admin/login");
  const sp = await searchParams;
  const storeIds = (sp.stores ?? "").split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s)).slice(0, 2000);
    // From Leads: a matching template; otherwise ?template=<id>
  const templateId = sp.template ?? (sp.from === "upgrade" ? "pro-selling" : sp.from === "unfinished" ? "first-products" : null);
  return <CampaignBuilder adminEmail={admin.email} storeIds={storeIds} templateId={templateId} />;
}
