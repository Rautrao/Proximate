import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  phone: string;
  token: string;
}

interface AuthState {
  user: User | null;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isHydrated: false,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'proximate-auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ isHydrated: true });
      },
    }
  )
);
