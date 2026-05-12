import { redirect } from "next/navigation";
import { verifySession, getUserStore } from "@/lib/auth";
import SettingsClient from "@/components/dashboard/SettingsClient";

export default async function SettingsPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");

  const store = await getUserStore(user.firebaseUid);
  if (!store) redirect("/onboarding");

  return <SettingsClient store={store} />;
}
