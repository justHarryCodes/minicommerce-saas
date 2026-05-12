import { redirect } from "next/navigation";
import { verifySession, getUserStore } from "@/lib/auth";

export default async function HomePage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");

  const store = await getUserStore(user.firebaseUid);
  if (!store) redirect("/onboarding");

  redirect("/dashboard");
}
