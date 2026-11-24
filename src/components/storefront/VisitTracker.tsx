"use client";

import { useEffect } from "react";
import { classifySource } from "@/lib/traffic-source";

interface Props {
  storeSlug: string;
  storeId: string;
}

export default function VisitTracker({ storeSlug, storeId }: Props) {
  // A friend's referral link (?ref=ADA-K7P2): keep the code for checkout
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
      if (ref && /^[A-Z]{1,6}-[A-Z0-9]{4}$/.test(ref)) localStorage.setItem(`sf_ref:${storeSlug}`, ref);
    } catch {}
  }, [storeSlug]);

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
      body: JSON.stringify({
        visitor_id: visitorId,
        source: classifySource({
          utmSource: new URLSearchParams(window.location.search).get("utm_source"),
          referrer: document.referrer,
          ownHost: window.location.hostname,
        }),
      }),
    })
      .then(() => sessionStorage.setItem(sessionKey, "1"))
      .catch(() => {});
  }, [storeSlug, storeId]);

  return null;
}
