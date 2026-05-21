import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSOSStore } from '@/store/sos';
import { useAuthStore } from '@/store/auth';
import { ESCALATION_TIERS } from '@/constants/escalation';
import { getCurrentLocation, requestLocationPermission } from '@/services/location';
import { getSocket } from '@/services/socket';

const haptic = {
  warn: () =>
    Platform.OS !== 'web'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      : Promise.resolve(),
  success: () =>
    Platform.OS !== 'web'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Promise.resolve(),
  light: () =>
    Platform.OS !== 'web'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : Promise.resolve(),
};

export function useSOSEngine() {
  const router = useRouter();
  const { status, currentTier, setStatus, setTier, addResponder, updateResponderEta, reset } = useSOSStore();
  const user = useAuthStore((s) => s.user);
  const escalationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearEscalation = useCallback(() => {
    if (escalationRef.current) {
      clearTimeout(escalationRef.current);
      escalationRef.current = null;
    }
  }, []);

  const escalateTier = useCallback(
    async (tier: number) => {
      if (tier > ESCALATION_TIERS.length) return;
      setTier(tier);

      const tierConfig = ESCALATION_TIERS[tier - 1];
      // Try for a real GPS fix, but never let permission/sensor failures
      // swallow the SOS itself — fall back to a known coarse coordinate.
      let location: { lat: number; lng: number; accuracy: number | null } = {
        lat: 12.9716,
        lng: 77.5946,
        accuracy: null,
      };
      try {
        if (await requestLocationPermission()) {
          location = await getCurrentLocation();
        }
      } catch {
        // Fall through with the fallback coordinate.
      }

      getSocket().emit('sos:escalate', {
        tier,
        radius: tierConfig.radius,
        location,
        userId: user?.id,
      });

      if (tierConfig.timeoutMs !== Infinity) {
        escalationRef.current = setTimeout(
          () => escalateTier(tier + 1),
          tierConfig.timeoutMs
        );
      }
    },
    [setTier, user]
  );

  const triggerSOS = useCallback(async () => {
    if (status !== 'idle') return;

    await haptic.warn();
    setStatus('active');
    router.push('/sos-active');
    escalateTier(1);
  }, [status, setStatus, router, escalateTier]);

  const cancelSOS = useCallback(async () => {
    clearEscalation();
    getSocket().emit('sos:cancel', { userId: user?.id });
    reset();
    await haptic.success();
    router.replace('/(tabs)');
  }, [clearEscalation, reset, router, user]);

  // Wire up incoming responder acknowledgements + ETA updates from the server
  useEffect(() => {
    const socket = getSocket();

    const handleAck = (responder: {
      id: string;
      name: string;
      distance: number;
    }) => {
      addResponder({ ...responder, acknowledgedAt: Date.now() });
      haptic.light();
    };

    const handleEta = (eta: {
      id: string;
      routeDistanceMeters: number;
      routeDurationSeconds: number;
    }) => {
      updateResponderEta(eta.id, {
        routeDistanceMeters: eta.routeDistanceMeters,
        routeDurationSeconds: eta.routeDurationSeconds,
      });
    };

    socket.on('sos:responder_ack', handleAck);
    socket.on('sos:responder_eta', handleEta);
    return () => {
      socket.off('sos:responder_ack', handleAck);
      socket.off('sos:responder_eta', handleEta);
    };
  }, [addResponder, updateResponderEta]);

  useEffect(() => () => clearEscalation(), [clearEscalation]);

  return { triggerSOS, cancelSOS, status, currentTier };
}
