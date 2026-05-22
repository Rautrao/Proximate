import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * User-controllable safety preferences. Persisted so the choice survives
 * app restarts. Defaults are biased toward maximum information for
 * responders — users can opt out per stream.
 */
interface PreferencesState {
  videoEnabled: boolean;
  setVideoEnabled: (v: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      videoEnabled: true,
      setVideoEnabled: (videoEnabled) => set({ videoEnabled }),
    }),
    {
      name: 'proximate-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
