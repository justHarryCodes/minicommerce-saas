import { create } from "zustand";

interface State {
  open: boolean;
  setOpen: (v: boolean) => void;
}

export const useDashboardDrawer = create<State>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}));
