import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";
import { listApplications, listRounds } from "@/lib/grants";
import GrantsAdminClient from "./GrantsAdminClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vendor Grant" };

export default async function AdminGrantsPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const admin = await verifyAdminSession();
  if (!admin) redirect("/admin/login");
  const rounds = await listRounds();
  const asked = (await searchParams).round;
  const round = rounds.find((r) => r.id === asked) ?? rounds[0] ?? null;
  const applications = round ? await listApplications(round.id) : [];
  return <GrantsAdminClient rounds={JSON.parse(JSON.stringify(rounds))} round={round ? JSON.parse(JSON.stringify(round)) : null} applications={JSON.parse(JSON.stringify(applications))} />;
}
