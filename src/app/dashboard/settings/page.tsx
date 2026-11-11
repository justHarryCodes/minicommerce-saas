import { redirect } from "next/navigation";
import { verifySession, getUserStore } from "@/lib/auth";
import { emailConfigured, smsConfigured } from "@/lib/notify/providers";
import { getPlatformSettings } from "@/lib/admin-auth";
import SettingsClient from "@/components/dashboard/SettingsClient";
import { hasFeature } from "@/lib/plan";

export default async function SettingsPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");

  const store = await getUserStore(user.firebaseUid);
  if (!store) redirect("/onboarding");

  const included = await hasFeature(store.id, "customer_messages");
  const { allow_manual_transfers } = await getPlatformSettings();
  return (
    <SettingsClient
      store={store}
      messaging={{ sms: smsConfigured(), email: emailConfigured(), included }}
      allowManualTransfers={allow_manual_transfers}
    />
  );
}
