import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AuthActionHandler from "./AuthActionHandler";

// https://dukanigeria.com/_/auth/action — where Firebase sends people from
// verification, password-reset and email-change emails. (The folder is
// "%5F" because Next.js treats folders starting with "_" as private.)
// Set as the custom action URL in Firebase → Authentication → Templates.
export const metadata: Metadata = {
  title: "Account · Duka",
  robots: { index: false, follow: false },
};

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      }
    >
      <AuthActionHandler />
    </Suspense>
  );
}
