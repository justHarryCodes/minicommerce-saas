import { redirect } from "next/navigation";
import { featureGate } from "@/components/dashboard/FeatureGate";
import { verifySession, getUserStore } from "@/lib/auth";
import { listTeam } from "@/lib/team";
import TeamClient from "./TeamClient";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  // Owner-only: a team member never gets a store back from getUserStore
  const store = await getUserStore(user.firebaseUid);
  if (!store) redirect("/dashboard/orders");
  const gate = await featureGate(store.id, "team");
  if (gate) return gate;

  const members = await listTeam(store.id);

  return (
    <div className="max-w-3xl mx-auto space-y-5 pt-4 lg:pt-0">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Team</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Give your staff their own login. They only see what their role allows — never your settings, payouts or billing.
        </p>
      </div>
      <TeamClient
        ownerEmail={user.email}
        members={members.map((m) => ({
          ...m,
          invited_at: new Date(m.invited_at).toISOString(),
          accepted_at: m.accepted_at ? new Date(m.accepted_at).toISOString() : null,
          last_seen_at: m.last_seen_at ? new Date(m.last_seen_at).toISOString() : null,
        }))}
      />
    </div>
  );
}
