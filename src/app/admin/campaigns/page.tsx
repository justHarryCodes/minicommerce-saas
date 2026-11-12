import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";
import CampaignsClient from "./CampaignsClient";

export const metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  const admin = await verifyAdminSession();
  if (!admin) redirect("/admin/login");
  return <CampaignsClient adminEmail={admin.email} />;
}
