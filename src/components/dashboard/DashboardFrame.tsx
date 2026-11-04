"use client";

// Offsets the page for the desktop sidebar (full or icon rail) and owns the
// ⌘K shortcut. The saved rail preference is applied after mount so the
// server HTML and the first client render always agree.
import { useEffect, useState } from "react";
import { useDashboardDrawer } from "@/lib/dashboard-drawer-store";
import { cn } from "@/lib/utils";

export function useRail(): boolean {
  const collapsed = useDashboardDrawer((s) => s.collapsed);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && collapsed;
}

export default function DashboardFrame({ children }: { children: React.ReactNode }) {
  const rail = useRail();
  const setPaletteOpen = useDashboardDrawer((s) => s.setPaletteOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);

  return <div className={cn("dash flex min-h-screen flex-col transition-[padding] duration-200", rail ? "lg:pl-14" : "lg:pl-56")}>{children}</div>;
}
