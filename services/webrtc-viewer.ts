/**
 * Responder-side WebRTC: subscribe to the victim's live camera stream once
 * the victim has acked us into the call. Mirrors the receive logic on the
 * responder dashboard so the citizen app's "I am a responder" view can show
 * the same feed.
 *
 * Web-only. The peer-connection plumbing is identical to the dashboard at
 * responder/src/App.tsx — this just packages it as a per-victim handle.
 */
import { Platform } from 'react-native';
import type { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export type VictimViewerHandle = {
  stop: () => void;
};

type Options = {
  socket: Socket;
  victimUserId: string;
  onStream: (stream: MediaStream) => void;
  onError?: (err: string) => void;
};

export function startVictimViewer({
  socket,
  victimUserId,
  onStream,
  onError,
}: Options): VictimViewerHandle | null {
  if (Platform.OS !== 'web' || typeof RTCPeerConnection === 'undefined') {
    onError?.('webrtc-unsupported');
    return null;
  }

  let pc: RTCPeerConnection | null = null;
  const pendingIce: RTCIceCandidateInit[] = [];
  let remoteSet = false;

  async function onOffer({
    userId,
    sdp,
  }: {
    userId: string;
    sdp: RTCSessionDescriptionInit;
  }) {
    // Only handle offers from THIS victim — multiple incidents could be flowing
    // through the same socket if more than one is active in the area.
    if (userId !== victimUserId) return;

    pc?.close();
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (stream) onStream(stream);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtc:ice', {
          userId: victimUserId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    try {
      await pc.setRemoteDescription(sdp);
      remoteSet = true;
      for (const c of pendingIce) {
        try { await pc.addIceCandidate(c); } catch { /* ignore */ }
      }
      pendingIce.length = 0;

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { userId: victimUserId, sdp: answer });
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'offer-failed');
    }
  }

  async function onIce({
    userId,
    candidate,
  }: {
    userId: string;
    candidate: RTCIceCandidateInit;
  }) {
    if (userId !== victimUserId) return;
    if (!pc || !remoteSet) {
      pendingIce.push(candidate);
      return;
    }
    try { await pc.addIceCandidate(candidate); } catch { /* ignore */ }
  }

  socket.on('webrtc:offer', onOffer);
  socket.on('webrtc:ice', onIce);

  return {
    stop() {
      socket.off('webrtc:offer', onOffer);
      socket.off('webrtc:ice', onIce);
      pc?.close();
      pc = null;
    },
  };
}
