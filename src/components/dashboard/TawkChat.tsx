"use client";

import { useEffect } from "react";

export default function TawkChat() {
  useEffect(() => {
    if (document.getElementById("tawk-script")) return;

    (window as unknown as Record<string, unknown>).Tawk_API =
      (window as unknown as Record<string, unknown>).Tawk_API || {};
    (window as unknown as Record<string, unknown>).Tawk_LoadStart = new Date();

    const s1 = document.createElement("script");
    const s0 = document.getElementsByTagName("script")[0];
    s1.id = "tawk-script";
    s1.async = true;
    s1.src = "https://embed.tawk.to/686fbff8ca9b1d190e69de6a/1jp75drpv";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    s0.parentNode!.insertBefore(s1, s0);
  }, []);

  return null;
}
