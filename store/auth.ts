import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  loading: true,
  setUser: (user) => {
    console.log('[AuthStore] setUser →', user ? user.email : null);
    set({ user });
  },
  setLoading: (loading) => {
    console.log('[AuthStore] setLoading →', loading);
    set({ loading });
  },
}));
