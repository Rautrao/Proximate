/**
 * Citizen-side WebRTC: capture the device camera + microphone on SOS active,
 * then for every responder that acknowledges, open an RTCPeerConnection,
 * send an SDP offer over the existing Socket.IO signaling channel, and
 * exchange ICE candidates until video is flowing.
 *
 * Web-only. Native (real iOS/Android) would need react-native-webrtc — out
 * of scope for the demo. We `Platform.OS === 'web'` guard the entry point.
 */
import { Platform } from 'react-native';
import type { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCIceServer[] = [
  // Free public STUN — enough for citizen and responder on the same LAN /
  // most home networks. For symmetric NAT a TURN server would be needed.
  { urls: 'stun:stun.l.google.com:19302' },
];

type PerResponder = {
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
  remoteSet: boolean;
};

export type LiveStreamHandle = {
  stop: () => void;
  attachResponder: (responderId: string) => Promise<void>;
  removeResponder: (responderId: string) => void;
};

export type LiveStreamError =
  | 'unsupported'      // not a browser / no mediaDevices API
  | 'insecure_origin'  // not HTTPS or localhost
  | 'permission_denied' // user denied or browser blocked
  | 'no_device'        // no camera on the system / OS-level block
  | 'device_busy'      // another app (Windows Camera, Zoom, OBS) has it
  | 'unknown';

export type LiveStreamResult =
  | { ok: true; handle: LiveStreamHandle }
  | { ok: false; error: LiveStreamError; message?: string };

export async function startLiveStream({
  socket,
}: {
  socket: Socket;
}): Promise<LiveStreamResult> {
  if (Platform.OS !== 'web') {
    return { ok: false, error: 'unsupported' };
  }
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, error: 'unsupported' };
  }
  // getUserMedia silently fails on http origins other than localhost.
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return { ok: false, error: 'insecure_origin' };
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 360 },
      audio: true,
    });
  } catch (e) {
    const err = e as DOMException;
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return { ok: false, error: 'permission_denied', message: err.message };
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return { ok: false, error: 'no_device', message: err.message };
    }
    if (
      err.name === 'NotReadableError' ||
      err.name === 'TrackStartError' ||
      err.name === 'AbortError'
    ) {
      return { ok: false, error: 'device_busy', message: err.message };
    }
    return { ok: false, error: 'unknown', message: err.message };
  }

  const peers = new Map<string, PerResponder>();

  async function attachResponder(responderId: string) {
    if (peers.has(responderId)) return;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const slot: PerResponder = { pc, pendingIce: [], remoteSet: false };
    peers.set(responderId, slot);

    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtc:ice', {
          responderId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc:offer', { responderId, sdp: offer });
  }

  function removeResponder(responderId: string) {
    const slot = peers.get(responderId);
    if (!slot) return;
    slot.pc.close();
    peers.delete(responderId);
  }

  async function handleAnswer(msg: { responderId: string; sdp: RTCSessionDescriptionInit }) {
    const slot = peers.get(msg.responderId);
    if (!slot) return;
    await slot.pc.setRemoteDescription(msg.sdp);
    slot.remoteSet = true;
    for (const c of slot.pendingIce) {
      try {
        await slot.pc.addIceCandidate(c);
      } catch {
        // ignore — non-critical
      }
    }
    slot.pendingIce = [];
  }

  async function handleIce(msg: { responderId: string; candidate: RTCIceCandidateInit }) {
    const slot = peers.get(msg.responderId);
    if (!slot) return;
    if (!slot.remoteSet) {
      slot.pendingIce.push(msg.candidate);
      return;
    }
    try {
      await slot.pc.addIceCandidate(msg.candidate);
    } catch {
      // ignore — non-critical
    }
  }

  socket.on('webrtc:answer', handleAnswer);
  socket.on('webrtc:ice', handleIce);

  function stop() {
    socket.off('webrtc:answer', handleAnswer);
    socket.off('webrtc:ice', handleIce);
    peers.forEach((slot) => slot.pc.close());
    peers.clear();
    stream.getTracks().forEach((t) => t.stop());
  }

  return { ok: true, handle: { stop, attachResponder, removeResponder } };
}
