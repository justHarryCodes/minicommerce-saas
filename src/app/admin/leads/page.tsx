import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";
import { unfinishedLeads, upgradeLeads } from "@/lib/admin/leads";
import LeadsClient from "./LeadsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  if (!(await verifyAdminSession())) redirect("/admin/login");
  const { tab } = await searchParams;
  const [unfinished, upgrade] = await Promise.all([unfinishedLeads({ withSignups: true }), upgradeLeads()]);
  return <LeadsClient initialTab={tab === "upgrade" ? "upgrade" : "unfinished"} unfinished={JSON.parse(JSON.stringify(unfinished))} upgrade={JSON.parse(JSON.stringify(upgrade))} />;
}
