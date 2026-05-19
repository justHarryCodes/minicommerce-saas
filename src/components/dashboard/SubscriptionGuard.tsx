"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function SubscriptionGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (
      pathname === "/dashboard/billing" ||
      pathname.startsWith("/dashboard/billing/")
    ) return;

    fetch("/api/subscription-status")
      .then((r) => r.json())
      .then((data) => {
        if (data.required && !data.paid) {
          router.replace("/dashboard/billing");
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  return null;
}
