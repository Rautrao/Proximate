import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LanguageCode } from '@/constants/quiz';

/**
 * Tracks the onboarding quiz status. Persisted so a user who passed once
 * doesn't have to re-quiz on the same device. Failed attempts trigger a
 * cooldown so a malicious actor can't brute-force.
 */
interface OnboardingState {
  language: LanguageCode | null;
  quizPassed: boolean;
  lastFailedAt: number | null;     // epoch ms, null if no recent failure
  setLanguage: (l: LanguageCode) => void;
  recordPass: () => void;
  recordFailure: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      language: null,
      quizPassed: false,
      lastFailedAt: null,
      setLanguage: (language) => set({ language }),
      recordPass: () => set({ quizPassed: true, lastFailedAt: null }),
      recordFailure: () => set({ lastFailedAt: Date.now() }),
      reset: () => set({ language: null, quizPassed: false, lastFailedAt: null }),
    }),
    {
      name: 'proximate-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
