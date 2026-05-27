import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EscalationRing } from '@/components/EscalationRing';
import { ResponderList } from '@/components/ResponderList';
import { useSOSEngine } from '@/hooks/useSOSEngine';
import { useSOSStore } from '@/store/sos';
import { useAuthStore } from '@/store/auth';
import { usePreferencesStore } from '@/store/preferences';
import { getSocket } from '@/services/socket';
import {
  startLiveStream,
  type LiveStreamError,
  type LiveStreamHandle,
} from '@/services/webrtc';

type VideoStatus =
  | 'off'
  | 'starting'
  | 'streaming'      // real camera
  | 'simulated'      // mock fallback (real camera unavailable)
  | LiveStreamError;
import { CANCEL_GRACE_SECONDS, ESCALATION_TIERS } from '@/constants/escalation';

export default function SOSActiveScreen() {
  const { cancelSOS, currentTier } = useSOSEngine();
  const triggeredAt = useSOSStore((s) => s.triggeredAt);
  const responders = useSOSStore((s) => s.responders);
  const user = useAuthStore((s) => s.user);
  const videoEnabled = usePreferencesStore((s) => s.videoEnabled);

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [nextEscIn, setNextEscIn] = useState(60);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>('off');
  const [retryTick, setRetryTick] = useState(0);
  const cancelOpacity = useRef(new Animated.Value(1)).current;
  const streamRef = useRef<LiveStreamHandle | null>(null);
  const attachedRef = useRef<Set<string>>(new Set());

  // Capture camera + mic on mount, stop on unmount — but only if the user
  // has video enabled in preferences (Home → "Video on/off" pill).
  // The dashboard receives the live feed once a responder acks — see services/webrtc.ts.
  useEffect(() => {
    if (!user?.id) return;
    if (!videoEnabled) {
      setVideoStatus('off');
      return;
    }
    let cancelled = false;
    setVideoStatus('starting');
    (async () => {
      const result = await startLiveStream({ socket: getSocket() });
      if (cancelled) {
        if (result.ok) result.handle.stop();
        return;
      }
      if (result.ok) {
        streamRef.current = result.handle;
        setVideoStatus(result.source === 'mock' ? 'simulated' : 'streaming');
        if (result.source === 'mock') {
          console.warn(
            '[webrtc] real camera unavailable (' + result.fallbackReason + ') — using simulated feed'
          );
        }
      } else {
        setVideoStatus(result.error);
        console.warn('[webrtc] camera capture failed:', result.error, result.message);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.stop();
      streamRef.current = null;
      attachedRef.current.clear();
      setVideoStatus('off');
    };
  }, [user?.id, videoEnabled, retryTick]);

  // Open a peer connection per new responder once they ack.
  useEffect(() => {
    const handle = streamRef.current;
    if (!handle) return;
    responders.forEach((r) => {
      if (!attachedRef.current.has(r.id)) {
        attachedRef.current.add(r.id);
        handle.attachResponder(r.id).catch(() => {
          attachedRef.current.delete(r.id);
        });
      }
    });
  }, [responders]);

  // Tick every second
  useEffect(() => {
    const start = triggeredAt ?? Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setSecondsElapsed(elapsed);

      // Seconds since current tier started
      const tierElapsed = elapsed - (currentTier - 1) * 60;
      setNextEscIn(Math.max(0, 60 - tierElapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [triggeredAt, currentTier]);

  // Fade cancel button after grace period
  useEffect(() => {
    if (secondsElapsed >= CANCEL_GRACE_SECONDS) {
      Animated.timing(cancelOpacity, {
        toValue: 0.35,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [secondsElapsed >= CANCEL_GRACE_SECONDS, cancelOpacity]);

  const inGrace = secondsElapsed < CANCEL_GRACE_SECONDS;
  const tierConfig = ESCALATION_TIERS[Math.min(currentTier, ESCALATION_TIERS.length) - 1];
  const isLastTier = currentTier >= ESCALATION_TIERS.length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Ionicons name="warning" size={22} color="#FCA5A5" />
          <Text style={styles.headerText}>EMERGENCY ACTIVE</Text>
          <View style={styles.elapsed}>
            <Text style={styles.elapsedText}>{formatTime(secondsElapsed)}</Text>
          </View>
        </View>

        {/* Escalation ring */}
        <View style={styles.ringArea}>
          <EscalationRing />
        </View>

        {/* Next escalation countdown */}
        {!isLastTier && (
          <View style={styles.escalationRow}>
            <Ionicons name="arrow-up-circle-outline" size={16} color="#9CA3AF" />
            <Text style={styles.escalationText}>
              Escalating to {ESCALATION_TIERS[currentTier].label} in{' '}
              <Text style={{ color: tierConfig.color }}>{nextEscIn}s</Text>
            </Text>
          </View>
        )}
        {isLastTier && (
          <View style={styles.escalationRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#22C55E" />
            <Text style={styles.escalationText}>
              Maximum radius reached · Police notified
            </Text>
          </View>
        )}

        {/* Video status — surfaces camera/permission state so the user knows
            whether their feed is actually streaming to responders. */}
        <VideoStatusPill
          status={videoStatus}
          onRetry={() => setRetryTick((n) => n + 1)}
        />

        {/* Responders */}
        <View style={styles.responderArea}>
          <ResponderList />
        </View>

        {/* Cancel button */}
        <Animated.View style={[styles.cancelWrap, { opacity: cancelOpacity }]}>
          <Pressable
            onPress={cancelSOS}
            style={({ pressed }) => [
              styles.cancelBtn,
              inGrace && styles.cancelBtnGrace,
              pressed && styles.cancelBtnPressed,
            ]}
          >
            <Text style={[styles.cancelText, inGrace && styles.cancelTextGrace]}>
              {inGrace
                ? `Cancel SOS  ·  ${CANCEL_GRACE_SECONDS - secondsElapsed}s`
                : 'Cancel SOS'}
            </Text>
          </Pressable>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function VideoStatusPill({
  status,
  onRetry,
}: {
  status: VideoStatus;
  onRetry: () => void;
}) {
  const config = (() => {
    switch (status) {
      case 'streaming':
        return {
          icon: 'videocam' as const,
          color: '#22C55E',
          bg: '#052e16',
          border: '#166534',
          label: 'Live video streaming to responders',
          retryable: false,
        };
      case 'simulated':
        return {
          icon: 'videocam' as const,
          color: '#FCD34D',
          bg: '#1F1502',
          border: '#854D0E',
          label: 'Simulated feed streaming (real camera unavailable) · tap to retry',
          retryable: true,
        };
      case 'starting':
        return {
          icon: 'videocam-outline' as const,
          color: '#FCD34D',
          bg: '#1F1502',
          border: '#854D0E',
          label: 'Starting camera…',
          retryable: false,
        };
      case 'permission_denied':
        return {
          icon: 'alert-circle' as const,
          color: '#F87171',
          bg: '#1A0A0A',
          border: '#7F1D1D',
          label: 'Camera permission denied — grant it in your browser, then tap to retry',
          retryable: true,
        };
      case 'no_device':
        return {
          icon: 'videocam-off' as const,
          color: '#F87171',
          bg: '#1A0A0A',
          border: '#7F1D1D',
          label: 'No camera found — check Windows camera privacy, then tap to retry',
          retryable: true,
        };
      case 'device_busy':
        return {
          icon: 'videocam-off' as const,
          color: '#FCD34D',
          bg: '#1F1502',
          border: '#854D0E',
          label: 'Camera in use by another app — close it (e.g. Windows Camera), then tap to retry',
          retryable: true,
        };
      case 'insecure_origin':
        return {
          icon: 'lock-closed-outline' as const,
          color: '#F87171',
          bg: '#1A0A0A',
          border: '#7F1D1D',
          label: 'Video requires HTTPS or localhost',
          retryable: false,
        };
      case 'unsupported':
        return {
          icon: 'phone-portrait-outline' as const,
          color: '#9CA3AF',
          bg: '#1F2937',
          border: '#374151',
          label: 'Video unavailable on this device',
          retryable: false,
        };
      case 'unknown':
        return {
          icon: 'alert' as const,
          color: '#F87171',
          bg: '#1A0A0A',
          border: '#7F1D1D',
          label: 'Camera failed to start — tap to retry',
          retryable: true,
        };
      case 'off':
      default:
        return {
          icon: 'videocam-off-outline' as const,
          color: '#6B7280',
          bg: '#111827',
          border: '#374151',
          label: 'Video disabled — enable in Home',
          retryable: false,
        };
    }
  })();

  return (
    <Pressable
      onPress={config.retryable ? onRetry : undefined}
      style={({ pressed }) => [
        styles.videoPill,
        { backgroundColor: config.bg, borderColor: config.border },
        pressed && config.retryable && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={config.icon} size={14} color={config.color} />
      <Text style={[styles.videoPillText, { color: config.color }]}>
        {config.label}
      </Text>
      {config.retryable && (
        <Ionicons name="refresh" size={13} color={config.color} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0506' },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  elapsed: {
    backgroundColor: '#1A0A0A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#3F1A1A',
  },
  elapsedText: { color: '#F87171', fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  ringArea: {
    marginVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escalationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 28,
  },
  escalationText: { color: '#9CA3AF', fontSize: 13 },
  responderArea: { flex: 1, width: '100%' },
  cancelWrap: { width: '100%', marginBottom: 20 },
  cancelBtn: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  cancelBtnGrace: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  cancelBtnPressed: { opacity: 0.75 },
  cancelText: { color: '#9CA3AF', fontSize: 15, fontWeight: '600' },
  cancelTextGrace: { color: '#F9FAFB', fontSize: 16 },
  videoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  videoPillText: { fontSize: 12, fontWeight: '500' },
});
