"use client";

import { useEffect } from "react";

// Mounted once, site-wide, in the root layout. Registration failure is
// silently ignored — a missing service worker just means push/install
// don't work, it must never break the page itself.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
