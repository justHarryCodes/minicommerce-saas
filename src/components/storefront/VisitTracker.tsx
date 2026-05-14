"use client";

import { useEffect } from "react";

interface Props {
  storeSlug: string;
  storeId: string;
}

export default function VisitTracker({ storeSlug, storeId }: Props) {
  useEffect(() => {
    // Only fire once per browser session per store
    const sessionKey = `sf_visited_${storeId}`;
    if (sessionStorage.getItem(sessionKey)) return;

    // Stable visitor ID stored in localStorage (persists across sessions)
    let visitorId = localStorage.getItem("sf_vid");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("sf_vid", visitorId);
    }

    fetch(`/api/stores/${storeId}/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor_id: visitorId }),
    })
      .then(() => sessionStorage.setItem(sessionKey, "1"))
      .catch(() => {});
  }, [storeSlug, storeId]);

  return null;
}
