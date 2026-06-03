import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Gender =
  | 'female'
  | 'male'
  | 'nonbinary'
  | 'transgender_female'
  | 'transgender_male'
  | 'genderfluid'
  | 'genderqueer'
  | 'agender'
  | 'intersex'
  | 'other'
  | 'unspecified';
export type BloodGroup =
  | 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'unknown';
export type UserRole = 'citizen' | 'responder' | 'police';

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  role: UserRole;
  emergencyContacts?: EmergencyContact[];
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
