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

export interface EmergencyContact {
  name: string;
  phone: string;
}

// Everyone who registers is implicitly a citizen — the person who may need
// protection. Two independent opt-in flags layer on top:
//   - responderEnabled: a soft toggle (flippable anytime in Settings) that
//     subscribes the device to nearby distress alerts.
//   - isPolice: a credential claim. UI shows "verification pending" until an
//     admin approves it. Until then the account behaves exactly like a
//     responder.
export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  responderEnabled?: boolean;
  isPolice?: boolean;
  policeVerified?: boolean;
  emergencyContacts?: EmergencyContact[];
  token: string;
}

interface AuthState {
  user: User | null;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setResponderEnabled: (enabled: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isHydrated: false,
      setUser: (user) => set({ user }),
      setResponderEnabled: (enabled) =>
        set((s) => (s.user ? { user: { ...s.user, responderEnabled: enabled } } : s)),
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
