import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { SHAKE_COUNT_NEEDED, SHAKE_THRESHOLD, SHAKE_WINDOW_MS } from '@/constants/escalation';

/**
 * Fires onShake when the device is shaken with enough intensity.
 * Disabled automatically when enabled=false (e.g. during active SOS).
 */
export function useShakeTrigger(onShake: () => void, enabled = true) {
  const lastReading = useRef({ x: 0, y: 0, z: 0 });
  const shakeTimes = useRef<number[]>([]);
  const stableOnShake = useRef(onShake);

  useEffect(() => {
    stableOnShake.current = onShake;
  }, [onShake]);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const prev = lastReading.current;
      const delta = Math.sqrt(
        (x - prev.x) ** 2 + (y - prev.y) ** 2 + (z - prev.z) ** 2
      );
      lastReading.current = { x, y, z };

      if (delta > SHAKE_THRESHOLD) {
        const now = Date.now();
        shakeTimes.current = [
          ...shakeTimes.current.filter((t) => now - t < SHAKE_WINDOW_MS),
          now,
        ];
        if (shakeTimes.current.length >= SHAKE_COUNT_NEEDED) {
          shakeTimes.current = [];
          stableOnShake.current();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [enabled]);
}
