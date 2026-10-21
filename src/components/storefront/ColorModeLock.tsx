"use client";

import { useEffect } from "react";
import type { ColorMode } from "@/lib/themes/types";

/**
 * Pins the page to light or dark while a themed storefront is mounted, then
 * restores the visitor's own setting on the way out (e.g. back to the
 * dashboard). Done on <html> directly rather than via next-themes so the
 * visitor's saved preference is never overwritten. The inline script avoids
 * a flash of the wrong mode before hydration.
 */
export default function ColorModeLock({ mode }: { mode: ColorMode }) {
  useEffect(() => {
    if (mode === "auto") return;
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    const prevScheme = html.style.colorScheme;
    html.classList.toggle("dark", mode === "dark");
    html.style.colorScheme = mode;
    return () => {
      html.classList.toggle("dark", hadDark);
      html.style.colorScheme = prevScheme;
    };
  }, [mode]);

  if (mode === "auto") return null;
  const script = `document.documentElement.classList.${mode === "dark" ? "add" : "remove"}("dark");document.documentElement.style.colorScheme="${mode}";`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
