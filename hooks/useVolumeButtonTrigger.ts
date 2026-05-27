import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Triggers an SOS on a hardware-button gesture — the trigger style your
 * Assignment 2 design doc specifies ("When a distress event is triggered by
 * pressing volume/power buttons").
 *
 * Web demo: triple-press SPACE within 1500ms. Browsers can't capture
 * hardware volume keys reliably (they're handled by the OS audio stack),
 * so SPACE stands in for the volume key during desk demos.
 *
 * Native: swap the listener for `react-native-volume-manager` to read the
 * real Volume Up/Down. Same threshold, same callback contract.
 */
const TRIPLE_WINDOW_MS = 1500;
const TARGET_KEY = ' ';

export function useVolumeButtonTrigger(onTrigger: () => void, enabled = true) {
  const presses = useRef<number[]>([]);
  const stableCallback = useRef(onTrigger);

  useEffect(() => {
    stableCallback.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handler = (e: KeyboardEvent) => {
      // Don't hijack typing in form inputs.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key !== TARGET_KEY) return;
      e.preventDefault();

      const now = Date.now();
      presses.current = [
        ...presses.current.filter((p) => now - p < TRIPLE_WINDOW_MS),
        now,
      ];
      if (presses.current.length >= 3) {
        presses.current = [];
        stableCallback.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}
