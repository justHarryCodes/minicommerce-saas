import { create } from 'zustand';

interface NotificationsState {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  soundEnabled: true,
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
}));
