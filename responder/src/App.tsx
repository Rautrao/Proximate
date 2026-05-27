import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import L from 'leaflet';
import {
  ShieldCheck,
  Radio,
  MapPin,
  Clock,
  ChevronRight,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
 * Types & protocol
 * ────────────────────────────────────────────────────────────────────────── */
type Incident = {
  id: string;
  userId: string;
  victimName: string;
  status: 'active' | 'cancelled' | 'resolved';
  tier: 1 | 2 | 3;
  radius: number;
  location: { lat: number; lng: number };
  startedAt: number;
  endedAt?: number;
  escalationLog: { tier: number; radius: number; at: number }[];
  responders: { id: string; name: string; distance: number; acknowledgedAt: number }[];
  // Community verification (ISM Level 3 — false-alarm filter)
  verifiedBy?: string[];
  flaggedBy?: string[];
  pendingVerification?: boolean;
};

type LogEntry = {
  id: string;
  at: number;
  kind: 'incident' | 'escalation' | 'ack' | 'cancel' | 'system';
  message: string;
};

const SOCKET_URL = 'http://localhost:3000';
const RESPONDER_NAME = 'Officer Mehta · Patrol 04';

const TIER_LABELS = {
  1: { label: 'TIER 1', radiusLabel: '500m', tone: 'opacity-60' },
  2: { label: 'TIER 2', radiusLabel: '1km', tone: 'opacity-90' },
  3: { label: 'TIER 3', radiusLabel: '2km · POLICE PRIORITY', tone: 'opacity-100' },
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
 * Demo mode — generates synthetic incidents so the dashboard is alive even
 * when the mobile app isn't running. Vital fallback for live demos.
 * ────────────────────────────────────────────────────────────────────────── */
const DEMO_NAMES = ['Aanya R.', 'Vikram S.', 'Priya N.', 'Rohan K.', 'Meera D.', 'Sunita P.'];
const randName = () => DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];

function makeDemoIncident(seq: number): Incident {
  return {
    id: `demo-${seq}`,
    userId: `demo-user-${seq}`,
    victimName: randName(),
    status: 'active',
    tier: 1,
    radius: 500,
    location: { lat: 12.97 + Math.random() * 0.01, lng: 77.59 + Math.random() * 0.01 },
    startedAt: Date.now(),
    escalationLog: [{ tier: 1, radius: 500, at: Date.now() }],
    responders: [],
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * App
 * ────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [connected, setConnected] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  // Live victim video streams, keyed by the citizen's userId. Populated by
  // ontrack on the per-citizen RTCPeerConnection. We use a state setter so
  // the TacticalPanel re-renders the <video> when a stream arrives.
  const [streams, setStreams] = useState<Map<string, MediaStream>>(new Map());
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const demoSeq = useRef(0);

  const active = useMemo(() => incidents.filter((i) => i.status === 'active'), [incidents]);
  const selected = useMemo(
    () => incidents.find((i) => i.id === selectedId) || active[0] || null,
    [incidents, selectedId, active]
  );

  /* ── Socket lifecycle ──────────────────────────────────────────────────── */
  useEffect(() => {
    const s = io(SOCKET_URL, {
      auth: { role: 'responder', name: RESPONDER_NAME },
      transports: ['websocket'],
      reconnection: true,
    });
    socketRef.current = s;

    s.on('connect', () => {
      setConnected(true);
      addLog('system', `Connected as ${RESPONDER_NAME}`);
    });
    s.on('disconnect', () => {
      setConnected(false);
      addLog('system', 'Disconnected from network');
    });
    s.on('connect_error', () => setConnected(false));

    s.on('responder:snapshot', (list: Incident[]) => {
      setIncidents(list);
    });

    s.on('incident:update', (incident: Incident) => {
      setIncidents((prev) => {
        const exists = prev.find((i) => i.id === incident.id);
        if (!exists) {
          addLog('incident', `New SOS — ${incident.victimName} · TIER ${incident.tier}`);
          return [incident, ...prev];
        }
        if (exists.tier !== incident.tier) {
          if (incident.tier >= 3) {
            addLog(
              'escalation',
              `POLICE PRIORITY — ${incident.victimName} · TIER 3 · ${incident.radius}m`
            );
          } else {
            addLog(
              'escalation',
              `${incident.victimName} escalated to TIER ${incident.tier} · ${incident.radius}m`
            );
          }
        }
        if (incident.responders.length > exists.responders.length) {
          const newR = incident.responders[incident.responders.length - 1];
          addLog('ack', `${newR.name} responding to ${incident.victimName}`);
        }
        return prev.map((i) => (i.id === incident.id ? incident : i));
      });
    });

    s.on('incident:cancelled', ({ id }: { id: string }) => {
      setIncidents((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'cancelled', endedAt: Date.now() } : i))
      );
      const inc = incidents.find((i) => i.id === id);
      if (inc) addLog('cancel', `${inc.victimName} cancelled alert`);
    });

    // ── WebRTC: receive a citizen's video feed once we've acked ────────────
    s.on('webrtc:offer', async ({ userId, sdp }: { userId: string; sdp: RTCSessionDescriptionInit }) => {
      // One peer connection per citizen. If we already have one (re-ack), tear down.
      peersRef.current.get(userId)?.close();
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peersRef.current.set(userId, pc);

      pc.ontrack = (e) => {
        const stream = e.streams[0];
        if (!stream) return;
        setStreams((prev) => {
          if (prev.get(userId) === stream) return prev;
          const next = new Map(prev);
          next.set(userId, stream);
          return next;
        });
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          s.emit('webrtc:ice', { userId, candidate: e.candidate.toJSON() });
        }
      };

      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit('webrtc:answer', { userId, sdp: answer });
    });

    s.on('webrtc:ice', async ({ userId, candidate }: { userId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(userId);
      if (!pc) return;
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // benign — late candidates
      }
    });

    return () => {
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Demo mode loop ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!demoMode) return;
    const inject = () => {
      demoSeq.current += 1;
      const inc = makeDemoIncident(demoSeq.current);
      setIncidents((p) => [inc, ...p]);
      addLog('incident', `New SOS — ${inc.victimName} · TIER 1`);

      const t2 = setTimeout(() => {
        setIncidents((p) =>
          p.map((i) =>
            i.id === inc.id
              ? {
                  ...i,
                  tier: 2,
                  radius: 1000,
                  escalationLog: [...i.escalationLog, { tier: 2, radius: 1000, at: Date.now() }],
                }
              : i
          )
        );
        addLog('escalation', `${inc.victimName} escalated to TIER 2 · 1000m`);
      }, 9000);

      const t3 = setTimeout(() => {
        setIncidents((p) =>
          p.map((i) =>
            i.id === inc.id
              ? {
                  ...i,
                  tier: 3,
                  radius: 2000,
                  escalationLog: [...i.escalationLog, { tier: 3, radius: 2000, at: Date.now() }],
                }
              : i
          )
        );
        addLog('escalation', `POLICE PRIORITY — ${inc.victimName} · TIER 3 · 2km`);
      }, 18000);

      const resolve = setTimeout(() => {
        setIncidents((p) =>
          p.map((i) => (i.id === inc.id ? { ...i, status: 'cancelled', endedAt: Date.now() } : i))
        );
        addLog('cancel', `${inc.victimName} alert resolved`);
      }, 34000);

      return () => {
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(resolve);
      };
    };
    inject();
    const id = setInterval(inject, 18000);
    return () => clearInterval(id);
  }, [demoMode]);

  function addLog(kind: LogEntry['kind'], message: string) {
    setLog((p) =>
      [
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now(), kind, message },
        ...p,
      ].slice(0, 80)
    );
  }

  function ackIncident(inc: Incident) {
    // 800m–2km spawn so the responder pip has a visibly long route to traverse
    // when it animates toward the victim. Real device GPS replaces this later.
    const distance = 800 + Math.floor(Math.random() * 1200);
    if (inc.id.startsWith('demo-')) {
      const responder = {
        id: 'demo-responder',
        name: RESPONDER_NAME,
        distance,
        acknowledgedAt: Date.now(),
      };
      setIncidents((p) =>
        p.map((i) =>
          i.id === inc.id ? { ...i, responders: [...i.responders, responder] } : i
        )
      );
      addLog('ack', `${RESPONDER_NAME} responding to ${inc.victimName}`);
      return;
    }
    socketRef.current?.emit('responder:ack', { incidentId: inc.id, distance });
  }

  function verifyIncident(inc: Incident) {
    if (inc.id.startsWith('demo-')) {
      setIncidents((p) =>
        p.map((i) =>
          i.id === inc.id
            ? { ...i, verifiedBy: [...(i.verifiedBy || []), 'demo-responder'] }
            : i
        )
      );
      addLog('ack', `${RESPONDER_NAME} verified ${inc.victimName}'s alert`);
      return;
    }
    socketRef.current?.emit('responder:verify', { incidentId: inc.id });
  }

  function flagFalseAlarm(inc: Incident) {
    if (inc.id.startsWith('demo-')) {
      setIncidents((p) =>
        p.map((i) =>
          i.id === inc.id
            ? { ...i, flaggedBy: [...(i.flaggedBy || []), 'demo-responder'] }
            : i
        )
      );
      addLog('cancel', `${RESPONDER_NAME} flagged ${inc.victimName} as possible false alarm`);
      return;
    }
    socketRef.current?.emit('responder:flag_false_alarm', { incidentId: inc.id });
  }

  const tier3Active = active.some((i) => i.tier >= 3);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 font-sans text-zinc-50 antialiased selection:bg-amber-400/30 selection:text-amber-100">
      <Header connected={connected} activeCount={active.length} demoMode={demoMode} onToggleDemo={setDemoMode} />

      <PolicePriorityBanner
        active={tier3Active}
        incidents={active.filter((i) => i.tier >= 3)}
      />

      <main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_340px]">
        <IncidentList
          incidents={incidents}
          selectedId={selected?.id ?? null}
          onSelect={(id) => setSelectedId(id)}
        />

        <TacticalPanel
          incident={selected}
          onAck={ackIncident}
          onVerify={verifyIncident}
          onFlag={flagFalseAlarm}
          streams={streams}
          onRouteResolved={(incidentId, responderId, info) => {
            // Only push ETAs for responders we're playing as. Demo incidents
            // stay local; real incidents emit through the socket so the
            // citizen UI can show "Officer Mehta · ETA 4 min".
            if (incidentId.startsWith('demo-')) return;
            socketRef.current?.emit('responder:eta', {
              incidentId,
              responderId,
              routeDistanceMeters: info.distanceMeters,
              routeDurationSeconds: info.durationSeconds,
            });
          }}
        />

        <ActivityFeed log={log} />
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Police Priority Banner — appears when any incident escalates to tier 3
 * ────────────────────────────────────────────────────────────────────────── */
function PolicePriorityBanner({
  active,
  incidents,
}: {
  active: boolean;
  incidents: Incident[];
}) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden border-b border-red-500/40 bg-red-500/10"
        >
          <div className="relative flex items-center justify-between px-8 py-2.5">
            <div className="absolute inset-0 animate-pulse bg-red-500/5" />
            <div className="relative flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-red-300">
                Police Priority Escalation
              </span>
              <span className="hidden text-[12px] text-zinc-400 sm:inline">
                · {incidents.length} incident{incidents.length === 1 ? '' : 's'} require{incidents.length === 1 ? 's' : ''} immediate dispatch
              </span>
            </div>
            <div className="relative hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-red-300/80 md:flex">
              {incidents.slice(0, 3).map((i) => (
                <span key={i.id} className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5">
                  {i.victimName}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Header
 * ────────────────────────────────────────────────────────────────────────── */
function Header({
  connected,
  activeCount,
  demoMode,
  onToggleDemo,
}: {
  connected: boolean;
  activeCount: number;
  demoMode: boolean;
  onToggleDemo: (v: boolean) => void;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-8 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-zinc-50" strokeWidth={1.5} />
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-medium tracking-[0.18em]">PROXIMATE</span>
          <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Responder Network
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-zinc-400 sm:flex">
          {connected ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.6} />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.6} />
          )}
          {connected ? 'Live' : 'Offline'}
        </div>

        <div className="hidden h-4 w-px bg-zinc-800 sm:block" />

        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
          <span className="relative flex h-2 w-2">
            {activeCount > 0 && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/60" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                activeCount > 0 ? 'bg-amber-400' : 'bg-zinc-600'
              }`}
            />
          </span>
          {activeCount} active
        </div>

        <button
          onClick={() => onToggleDemo(!demoMode)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition ${
            demoMode
              ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
              : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="h-3 w-3" strokeWidth={1.6} />
          Demo mode
        </button>

        <div className="flex items-center gap-3 border-l border-zinc-800 pl-6">
          <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-xs">
            M
          </div>
          <div className="hidden text-right text-[11px] sm:block">
            <p className="text-zinc-100">Officer Mehta</p>
            <p className="text-zinc-500">Patrol 04</p>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Incident list (left rail)
 * ────────────────────────────────────────────────────────────────────────── */
function IncidentList({
  incidents,
  selectedId,
  onSelect,
}: {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const active = incidents.filter((i) => i.status === 'active');
  const past = incidents.filter((i) => i.status !== 'active').slice(0, 8);

  return (
    <aside className="overflow-y-auto border-r border-zinc-800/60 bg-zinc-950">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/90 px-6 py-4 backdrop-blur-xl">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Active incidents</p>
        <span className="font-mono text-[11px] text-zinc-400">{active.length}</span>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <AnimatePresence initial={false}>
          {active.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center"
            >
              <Radio className="mx-auto h-5 w-5 text-zinc-700" strokeWidth={1.5} />
              <p className="mt-3 text-xs text-zinc-500">Network quiet.</p>
              <p className="mt-1 text-[10px] text-zinc-600">Waiting for incoming alerts.</p>
            </motion.div>
          )}

          {active.map((inc) => (
            <IncidentCard
              key={inc.id}
              inc={inc}
              selected={inc.id === selectedId}
              onClick={() => onSelect(inc.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {past.length > 0 && (
        <>
          <div className="sticky top-[57px] z-10 border-y border-zinc-800/60 bg-zinc-950/90 px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-zinc-500 backdrop-blur-xl">
            Recent
          </div>
          <ul className="px-4 py-3">
            {past.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-zinc-500"
              >
                <span className="truncate">{p.victimName}</span>
                <span className="font-mono text-[10px]">{p.status}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}

function IncidentCard({
  inc,
  selected,
  onClick,
}: {
  inc: Incident;
  selected: boolean;
  onClick: () => void;
}) {
  const elapsed = useElapsed(inc.startedAt);
  const tone = TIER_LABELS[inc.tier].tone;
  const isPolice = inc.tier >= 3;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition ${
        isPolice
          ? selected
            ? 'border-red-500/60 bg-red-500/[0.06]'
            : 'border-red-500/30 hover:border-red-500/60 hover:bg-red-500/[0.04]'
          : selected
          ? 'border-amber-400/40 bg-amber-400/[0.04]'
          : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-[3px] ${isPolice ? 'bg-red-500' : 'bg-amber-400'} ${tone}`}
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-50">{inc.victimName}</p>
          <p
            className={`mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
              isPolice ? 'text-red-300' : 'text-amber-300/80'
            }`}
          >
            {TIER_LABELS[inc.tier].label} · {TIER_LABELS[inc.tier].radiusLabel.split(' ')[0]}
            {isPolice && ' · POLICE'}
          </p>
        </div>
        <ChevronRight
          className={`h-4 w-4 transition ${
            selected
              ? isPolice
                ? 'text-red-300'
                : 'text-amber-300'
              : 'text-zinc-600 group-hover:text-zinc-400'
          }`}
        />
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5 font-mono">
          <Clock className="h-3 w-3" strokeWidth={1.6} />
          {elapsed}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono">
          <Activity className="h-3 w-3" strokeWidth={1.6} />
          {inc.responders.length} ack
        </span>
      </div>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Tactical panel (center)
 * ────────────────────────────────────────────────────────────────────────── */
function TacticalPanel({
  incident,
  onAck,
  onVerify,
  onFlag,
  streams,
  onRouteResolved,
}: {
  incident: Incident | null;
  onAck: (i: Incident) => void;
  onVerify: (i: Incident) => void;
  onFlag: (i: Incident) => void;
  streams: Map<string, MediaStream>;
  onRouteResolved?: (
    incidentId: string,
    responderId: string,
    info: { distanceMeters: number; durationSeconds: number }
  ) => void;
}) {
  // Hooks must run unconditionally — call before any early return.
  const elapsed = useElapsed(incident?.startedAt ?? Date.now());
  const [routes, setRoutes] = useState<Map<string, RouteInfo>>(new Map());

  // Fetch OSRM routes whenever a new responder joins. Cache prevents repeats.
  useEffect(() => {
    if (!incident) return;
    incident.responders.forEach((r) => {
      const cacheKey = `${incident.id}:${r.id}`;
      if (routes.has(r.id)) return;
      const bearing = hashBearing(r.id);
      const pos = offsetFrom(
        incident.location,
        Math.min(r.distance, 1800),
        bearing
      );
      fetchRoute(pos, [incident.location.lat, incident.location.lng], cacheKey).then(
        (info) => {
          if (!info) return;
          setRoutes((prev) => {
            if (prev.has(r.id)) return prev;
            const next = new Map(prev);
            next.set(r.id, info);
            return next;
          });
          // Relay the ETA back to the citizen via the parent's socket.
          onRouteResolved?.(incident.id, r.id, {
            distanceMeters: info.distanceMeters,
            durationSeconds: info.durationSeconds,
          });
        }
      );
    });
  }, [incident, routes, onRouteResolved]);

  // When switching to a different incident, drop the old routes.
  useEffect(() => {
    setRoutes(new Map());
  }, [incident?.id]);

  if (!incident) {
    return (
      <section className="flex items-center justify-center bg-zinc-950 px-12">
        <div className="max-w-md text-center">
          <Radio className="mx-auto h-7 w-7 text-zinc-700" strokeWidth={1.4} />
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">All clear.</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            No active incidents on your patrol perimeter. The system is listening.
            Select Demo mode to walk through a simulated response cycle.
          </p>
        </div>
      </section>
    );
  }

  const responded = incident.responders.length > 0;
  const isMine = incident.responders.some((r) => r.name === RESPONDER_NAME);

  return (
    <section className="relative flex flex-col overflow-y-auto bg-zinc-950">
      <div className="border-b border-zinc-800/60 px-10 py-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              Incident · {incident.id}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{incident.victimName}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-[0.18em]">
              <Pill amber>{TIER_LABELS[incident.tier].label}</Pill>
              <span className="font-mono text-zinc-400">
                Radius · {TIER_LABELS[incident.tier].radiusLabel}
              </span>
              <span className="font-mono text-zinc-400">Elapsed · {elapsed}</span>
              <span className="font-mono text-zinc-400">
                {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}
              </span>
            </div>
          </div>

          {incident.status === 'active' ? (
            <button
              onClick={() => onAck(incident)}
              disabled={isMine}
              className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition ${
                isMine
                  ? 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                  : 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
              }`}
            >
              {isMine ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Responding
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" /> I'm responding
                </>
              )}
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              <XCircle className="h-3.5 w-3.5" /> {incident.status}
            </span>
          )}
        </div>
      </div>

      <VerificationBar incident={incident} onVerify={onVerify} onFlag={onFlag} />

      <TacticalMap incident={incident} routes={routes} />

      <LiveVideoFeed stream={streams.get(incident.userId) || null} />

      <ResponderRoster incident={incident} responded={responded} routes={routes} />

      <EscalationTimeline incident={incident} />
    </section>
  );
}

function Pill({ children, amber }: { children: React.ReactNode; amber?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] ${
        amber
          ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
          : 'border-zinc-800 text-zinc-400'
      }`}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Tactical map — real OpenStreetMap (CartoDB Dark Matter) + escalation rings
 * ────────────────────────────────────────────────────────────────────────── */
const VICTIM_ICON = L.divIcon({
  className: '',
  html: '<div class="victim-marker"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});
const RESPONDER_ICON = L.divIcon({
  className: '',
  html: '<div class="responder-pip"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Stable offsets so responder pips don't all stack on the victim.
// In a real build these come from device GPS — here they're a deterministic
// bearing computed from the responder id + claimed distance.
function offsetFrom(
  center: { lat: number; lng: number },
  meters: number,
  bearingDeg: number
): [number, number] {
  const R = 6378137;
  const lat = (center.lat * Math.PI) / 180;
  const lng = (center.lng * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const dr = meters / R;
  const lat2 = Math.asin(Math.sin(lat) * Math.cos(dr) + Math.cos(lat) * Math.sin(dr) * Math.cos(brng));
  const lng2 =
    lng +
    Math.atan2(
      Math.sin(brng) * Math.sin(dr) * Math.cos(lat),
      Math.cos(dr) - Math.sin(lat) * Math.sin(lat2)
    );
  return [(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI];
}

function hashBearing(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h % 360);
}

// Haversine distance between two [lat, lng] points in metres.
function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6378137;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Linearly interpolate a position along a polyline at fraction t ∈ [0, 1].
// Segments are weighted by their real-world length so movement looks natural.
function pointAlongPath(
  coords: [number, number][],
  t: number
): [number, number] {
  if (coords.length === 0) return [0, 0];
  if (t <= 0) return coords[0];
  if (t >= 1) return coords[coords.length - 1];
  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = haversineMeters(coords[i - 1], coords[i]);
    segLens.push(d);
    total += d;
  }
  const target = t * total;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    if (acc + segLens[i] >= target) {
      const segT = segLens[i] === 0 ? 0 : (target - acc) / segLens[i];
      const [lat1, lng1] = coords[i];
      const [lat2, lng2] = coords[i + 1];
      return [lat1 + (lat2 - lat1) * segT, lng1 + (lng2 - lng1) * segT];
    }
    acc += segLens[i];
  }
  return coords[coords.length - 1];
}

type RouteInfo = {
  coords: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
};

// In-memory cache so we don't hammer the public OSRM demo server on re-renders.
const routeCache = new Map<string, RouteInfo>();

// OSRM public demo: free, no API key. Returns a GeoJSON LineString of the
// actual road network path from start to end plus distance + duration.
async function fetchRoute(
  start: [number, number],
  end: [number, number],
  cacheKey: string
): Promise<RouteInfo | null> {
  const cached = routeCache.get(cacheKey);
  if (cached) return cached;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    const coords = route?.geometry?.coordinates as [number, number][] | undefined;
    if (!coords?.length) return null;
    const info: RouteInfo = {
      coords: coords.map(([lng, lat]) => [lat, lng] as [number, number]),
      distanceMeters: route.distance ?? 0,
      durationSeconds: route.duration ?? 0,
    };
    routeCache.set(cacheKey, info);
    return info;
  } catch {
    return null;
  }
}

function TacticalMap({
  incident,
  routes,
}: {
  incident: Incident;
  routes: Map<string, RouteInfo>;
}) {
  const { lat, lng } = incident.location;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const animationsRef = useRef<number[]>([]);
  const currentRunRef = useRef(0);

  // Create the map exactly once when the host div mounts.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 14,
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render overlays (circles + markers) whenever the incident changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous overlays + in-flight animations.
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];
    animationsRef.current.forEach((id) => cancelAnimationFrame(id));
    animationsRef.current = [];

    // Ensure size + center are correct BEFORE we add layers, so each
    // layer's projection is computed against the right pixel origin.
    map.invalidateSize({ animate: false });
    map.setView([lat, lng], 14, { animate: false });

    const tiers = [
      { tier: 1, radius: 500 },
      { tier: 2, radius: 1000 },
      { tier: 3, radius: 2000 },
    ];

    tiers.forEach(({ tier, radius }) => {
      const isActive = incident.tier >= tier;
      const isCurrent = incident.tier === tier;
      // Tier 3 = police priority. Break the amber-only palette here on purpose:
      // emergency UX should signal urgency, not stay aesthetically pure.
      const isPolice = isCurrent && tier === 3;
      const accent = isPolice ? '#ef4444' : '#fbbf24';
      const circle = L.circle([lat, lng], {
        radius,
        color: isActive ? accent : 'rgba(255,255,255,0.18)',
        weight: isCurrent ? (isPolice ? 2.5 : 2) : 1,
        opacity: isCurrent ? 0.95 : isActive ? 0.6 : 0.4,
        dashArray: isCurrent ? undefined : '4 6',
        fillColor: accent,
        fillOpacity: isCurrent ? (isPolice ? 0.1 : 0.06) : 0,
      }).addTo(map);
      layersRef.current.push(circle);
    });

    const victim = L.marker([lat, lng], { icon: VICTIM_ICON }).addTo(map);
    layersRef.current.push(victim);

    currentRunRef.current += 1;

    incident.responders.forEach((r) => {
      const route = routes.get(r.id);
      const bearing = hashBearing(r.id);
      const fallbackPos = offsetFrom(
        { lat, lng },
        Math.min(r.distance, 1800),
        bearing
      );
      // Pip starts at the route's true start (snapped to road) if we have it,
      // otherwise at the hashed bearing offset so it shows up immediately.
      const startPos: [number, number] = route?.coords?.length
        ? route.coords[0]
        : fallbackPos;
      const m = L.marker(startPos, { icon: RESPONDER_ICON }).addTo(map);
      layersRef.current.push(m);

      if (route?.coords?.length) {
        const outline = L.polyline(route.coords, {
          color: '#fbbf24',
          weight: 6,
          opacity: 0.18,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        const core = L.polyline(route.coords, {
          color: '#fbbf24',
          weight: 2.5,
          opacity: 0.95,
          dashArray: '6 8',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        layersRef.current.push(outline, core);

        // Animate the pip along the route. Real OSRM ETAs can be minutes;
        // cap demo travel time at 30s so the movement is visible in a pitch.
        const durationMs = Math.min(route.durationSeconds * 1000, 30_000);
        const startTime = performance.now();
        const tick = () => {
          const t = Math.min((performance.now() - startTime) / durationMs, 1);
          m.setLatLng(pointAlongPath(route.coords, t) as L.LatLngTuple);
          if (t < 1) {
            const id = requestAnimationFrame(tick);
            animationsRef.current.push(id);
          }
        };
        const id = requestAnimationFrame(tick);
        animationsRef.current.push(id);
      }
    });
  }, [lat, lng, incident.tier, incident.responders, incident.id, routes]);

  return (
    <div className="relative mx-10 my-8 shrink-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40">
      <div className="relative">
        <div
          ref={containerRef}
          style={{ height: 440, width: '100%', position: 'relative', flexShrink: 0 }}
        />

        {/* HUD overlays */}
        <div className="pointer-events-none absolute left-5 top-5 z-[400] flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-950/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-300 backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          Tactical view · live
        </div>
        <div className="pointer-events-none absolute right-5 top-5 z-[400] rounded-full border border-zinc-800/80 bg-zinc-950/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400 backdrop-blur-md">
          {lat.toFixed(4)}°N · {lng.toFixed(4)}°E
        </div>
        <div className="pointer-events-none absolute bottom-5 left-5 z-[400] flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.22em]">
          {[
            { tier: 1, radius: 500 },
            { tier: 2, radius: 1000 },
            { tier: 3, radius: 2000 },
          ].map(({ tier, radius }) => {
            const isActive = incident.tier >= tier;
            const isPolice = isActive && tier === 3;
            const textCls = isPolice ? 'text-red-300' : isActive ? 'text-amber-300' : 'text-zinc-600';
            const dotCls = isPolice ? 'bg-red-500' : isActive ? 'bg-amber-400' : 'bg-zinc-700';
            return (
              <div key={tier} className={`flex items-center gap-2 ${textCls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
                Tier {tier} · {radius < 1000 ? `${radius}m` : `${radius / 1000}km`}
                {isPolice && <span className="ml-1 text-red-400">· POLICE</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VerificationBar({
  incident,
  onVerify,
  onFlag,
}: {
  incident: Incident;
  onVerify: (i: Incident) => void;
  onFlag: (i: Incident) => void;
}) {
  const verifies = (incident.verifiedBy || []).length;
  const flags = (incident.flaggedBy || []).length;
  const paused = !!incident.pendingVerification;
  return (
    <div className="border-t border-zinc-800/60 px-10 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Community verification
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {paused ? (
              <span className="text-red-300">
                ⚠ Escalation paused — {flags} responders flagged this as a possible false alarm
              </span>
            ) : (
              <>
                <span className="text-emerald-300">{verifies} verified</span>
                <span className="text-zinc-600"> · </span>
                <span className="text-amber-300">{flags} flagged false alarm</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVerify(incident)}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.6} />
            Verify
          </button>
          <button
            onClick={() => onFlag(incident)}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-amber-300 transition hover:bg-amber-500/20"
          >
            <XCircle className="h-3.5 w-3.5" strokeWidth={1.6} />
            False alarm
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveVideoFeed({ stream }: { stream: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="border-t border-zinc-800/60 px-10 py-6">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Live video feed
        </p>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          {stream ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              Streaming · victim cam + mic
            </>
          ) : (
            'Awaiting victim feed…'
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full bg-zinc-950 object-cover"
          />
        ) : (
          <div className="grid aspect-video w-full place-items-center bg-zinc-900/40 text-center">
            <div>
              <div
                className="mx-auto h-8 w-8 rounded-full border border-zinc-700"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                  animation: 'spin 2s linear infinite',
                }}
              />
              <p className="mt-3 text-xs text-zinc-500">
                Waiting for victim's camera feed
              </p>
              <p className="mt-1 text-[10px] text-zinc-600">
                Stream begins once you click "I'm responding" — the victim
                must also have Video enabled.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResponderRoster({
  incident,
  responded,
  routes,
}: {
  incident: Incident;
  responded: boolean;
  routes: Map<string, RouteInfo>;
}) {
  return (
    <div className="border-t border-zinc-800/60 px-10 py-6">
      <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Responders en route · {incident.responders.length}
      </p>
      {!responded ? (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
          No responder has acknowledged yet. Tap <span className="text-zinc-300">I'm responding</span> to claim this incident — the victim will see your ETA in real time.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {incident.responders.map((r) => {
            const route = routes.get(r.id);
            return (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-800 bg-zinc-950 text-xs">
                    {r.name[0]}
                  </div>
                  <div>
                    <p className="text-sm text-zinc-100">{r.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                      {route
                        ? `${formatDistance(route.distanceMeters)} · ETA ${formatDuration(route.durationSeconds)}`
                        : `${r.distance}m away · routing…`}
                      <span className="text-zinc-700"> · ack {timeAgo(r.acknowledgedAt)}</span>
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={1.6} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function EscalationTimeline({ incident }: { incident: Incident }) {
  return (
    <div className="border-t border-zinc-800/60 px-10 py-6">
      <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Escalation chain</p>
      <ol className="mt-5 space-y-3">
        {incident.escalationLog.map((step, i) => {
          const isPolice = step.tier >= 3;
          return (
            <li key={i} className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.16em]">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full border ${
                  isPolice ? 'border-red-500/50 text-red-300' : 'border-amber-400/40 text-amber-300'
                }`}
              >
                {step.tier}
              </span>
              <span className="text-zinc-400">{formatTime(step.at)}</span>
              <span className="text-zinc-500">·</span>
              <span className={isPolice ? 'text-red-300' : 'text-zinc-300'}>
                Tier {step.tier}{isPolice && ' · POLICE'}
              </span>
              <span className="text-zinc-500">· radius {step.radius}m</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Activity feed (right rail)
 * ────────────────────────────────────────────────────────────────────────── */
function ActivityFeed({ log }: { log: LogEntry[] }) {
  const kindStyles: Record<LogEntry['kind'], string> = {
    incident: 'text-amber-300 border-amber-400/40',
    escalation: 'text-amber-300 border-amber-400/40',
    ack: 'text-emerald-300 border-emerald-400/30',
    cancel: 'text-zinc-400 border-zinc-700',
    system: 'text-zinc-500 border-zinc-800',
  };
  return (
    <aside className="hidden border-l border-zinc-800/60 bg-zinc-950 xl:flex xl:flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/90 px-6 py-4 backdrop-blur-xl">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Activity feed</p>
        <span className="font-mono text-[11px] text-zinc-400">{log.length}</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        <AnimatePresence initial={false}>
          {log.map((e) => {
            const isPolice = e.message.includes('POLICE PRIORITY');
            const cls = isPolice
              ? 'text-red-300 border-red-500/60 bg-red-500/[0.06]'
              : `${kindStyles[e.kind]} bg-zinc-900/30`;
            return (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`rounded-xl border-l-2 px-4 py-3 text-[12px] leading-snug ${cls}`}
              >
                <p className={isPolice ? 'text-red-100' : 'text-zinc-100'}>{e.message}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {formatTime(e.at)}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {log.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-xs text-zinc-600">
            No events yet.
          </p>
        )}
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */
function useElapsed(start: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.floor((now - start) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}
