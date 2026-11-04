import { create } from "zustand";
import { persist } from "zustand/middleware";

interface State {
  /** Mobile drawer */
  open: boolean;
  setOpen: (v: boolean) => void;
  /** Desktop sidebar collapsed to an icon rail (remembered per browser) */
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  /** ⌘K palette */
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
}

export const useDashboardDrawer = create<State>()(
  persist(
    (set) => ({
      open: false,
      setOpen: (v) => set({ open: v }),
      collapsed: false,
      setCollapsed: (v) => set({ collapsed: v }),
      paletteOpen: false,
      setPaletteOpen: (v) => set({ paletteOpen: v }),
    }),
    // Only the rail preference survives a reload
    { name: "duka-dashboard-ui", partialize: (s) => ({ collapsed: s.collapsed }) }
  )
);
