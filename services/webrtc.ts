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

/**
 * Synthetic video stream — runs a canvas animation and captures it as a
 * MediaStream so the WebRTC pipeline can flow even when the real camera
 * is unavailable (Windows lock, no device, permission denied).
 *
 * Visually obviously a simulation so a juror can't mistake it for real
 * footage: amber pulse, "SIMULATED CAMERA FEED" label, live timestamp,
 * pulsing REC indicator.
 */
function buildMockStream(): { stream: MediaStream; stop: () => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  let frame = 0;
  const draw = () => {
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 640, 360);
    grad.addColorStop(0, '#1a0a0a');
    grad.addColorStop(1, '#09090b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 360);

    // Slowly drifting grid — proof the stream is alive
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    const off = (frame * 0.4) % 32;
    for (let x = -off; x < 640; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 360);
      ctx.stroke();
    }
    for (let y = -off; y < 360; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    // Pulsing amber center disc
    const pulse = Math.sin(frame * 0.05) * 0.3 + 0.5;
    ctx.fillStyle = `rgba(251, 191, 36, ${pulse * 0.18})`;
    ctx.beginPath();
    ctx.arc(320, 180, 70 + pulse * 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(251, 191, 36, ${0.5 + pulse * 0.5})`;
    ctx.beginPath();
    ctx.arc(320, 180, 14, 0, Math.PI * 2);
    ctx.fill();

    // Brand
    ctx.fillStyle = '#fafafa';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('PROXIMATE', 320, 70);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('SIMULATED CAMERA FEED', 320, 92);

    // Live timestamp (changes every frame — visible proof of liveness)
    ctx.font = '13px ui-monospace, monospace';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText(new Date().toLocaleTimeString(), 320, 310);
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = '#71717a';
    ctx.fillText('VICTIM CAM · LIVE', 320, 328);

    // Pulsing REC dot top-left
    const recAlpha = Math.abs(Math.sin(frame * 0.08));
    ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + recAlpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(36, 40, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fafafa';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('REC', 52, 44);

    frame++;
  };

  draw();
  const interval = window.setInterval(draw, 33); // ~30fps

  const stream = (canvas as HTMLCanvasElement & {
    captureStream: (fps: number) => MediaStream;
  }).captureStream(30);

  return {
    stream,
    stop: () => {
      window.clearInterval(interval);
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

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
