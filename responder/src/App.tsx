import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
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
          addLog(
            'escalation',
            `${incident.victimName} escalated to TIER ${incident.tier} · ${incident.radius}m`
          );
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

    return () => {
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

      const escalate = setTimeout(() => {
        setIncidents((p) =>
          p.map((i) => (i.id === inc.id ? { ...i, tier: 2, radius: 1000 } : i))
        );
        addLog('escalation', `${inc.victimName} escalated to TIER 2 · 1000m`);
      }, 9000);
      const resolve = setTimeout(() => {
        setIncidents((p) =>
          p.map((i) => (i.id === inc.id ? { ...i, status: 'cancelled', endedAt: Date.now() } : i))
        );
        addLog('cancel', `${inc.victimName} alert resolved`);
      }, 22000);
      return () => {
        clearTimeout(escalate);
        clearTimeout(resolve);
      };
    };
    inject();
    const id = setInterval(inject, 14000);
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
    const distance = 200 + Math.floor(Math.random() * 400);
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

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-50 antialiased selection:bg-amber-400/30 selection:text-amber-100">
      <Header connected={connected} activeCount={active.length} demoMode={demoMode} onToggleDemo={setDemoMode} />

      <main className="grid h-[calc(100vh-64px)] grid-cols-1 md:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_340px]">
        <IncidentList
          incidents={incidents}
          selectedId={selected?.id ?? null}
          onSelect={(id) => setSelectedId(id)}
        />

        <TacticalPanel incident={selected} onAck={ackIncident} />

        <ActivityFeed log={log} />
      </main>
    </div>
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

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition ${
        selected
          ? 'border-amber-400/40 bg-amber-400/[0.04]'
          : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
      }`}
    >
      <div className={`absolute inset-y-0 left-0 w-[3px] bg-amber-400 ${tone}`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-50">{inc.victimName}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
            {TIER_LABELS[inc.tier].label} · {TIER_LABELS[inc.tier].radiusLabel.split(' ')[0]}
          </p>
        </div>
        <ChevronRight
          className={`h-4 w-4 transition ${selected ? 'text-amber-300' : 'text-zinc-600 group-hover:text-zinc-400'}`}
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
}: {
  incident: Incident | null;
  onAck: (i: Incident) => void;
}) {
  // Hooks must run unconditionally — call before any early return.
  const elapsed = useElapsed(incident?.startedAt ?? Date.now());

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

      <TacticalMap incident={incident} />

      <ResponderRoster incident={incident} responded={responded} />

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

function FlyToIncident({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    // When the map mounts before its parent has its final layout, Leaflet
    // sets a stale pan origin. setView updates the center, but layers added
    // before that (markers, circles) keep their stale layer-point positions.
    // The fix is to invalidate, setView, then force every layer to reproject.
    const ll: [number, number] = [lat, lng];
    const settle = () => {
      map.invalidateSize({ animate: false });
      map.setView(ll, 14, { animate: false });
      map.eachLayer((layer) => {
        // Vector layers (Circle/Polygon) need redraw; Markers need update.
        const anyLayer = layer as unknown as {
          redraw?: () => void;
          update?: () => void;
        };
        anyLayer.redraw?.();
        anyLayer.update?.();
      });
    };

    const container = map.getContainer();
    const ro = new ResizeObserver(() => settle());
    ro.observe(container);

    settle();
    const r1 = requestAnimationFrame(() => {
      settle();
      requestAnimationFrame(settle);
    });

    return () => {
      cancelAnimationFrame(r1);
      ro.disconnect();
    };
  }, [lat, lng, map]);
  return null;
}

function TacticalMap({ incident }: { incident: Incident }) {
  const { lat, lng } = incident.location;
  const center: [number, number] = [lat, lng];

  const tiers = [
    { tier: 1, radius: 500 },
    { tier: 2, radius: 1000 },
    { tier: 3, radius: 2000 },
  ];

  return (
    <div className="relative mx-10 my-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40">
      <div className="relative" style={{ height: 440 }}>
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom={false}
          zoomControl={false}
          attributionControl={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          <FlyToIncident lat={lat} lng={lng} />

          {tiers.map(({ tier, radius }) => {
            const isActive = incident.tier >= tier;
            const isCurrent = incident.tier === tier;
            return (
              <Circle
                key={tier}
                center={center}
                radius={radius}
                pathOptions={{
                  color: isActive ? '#fbbf24' : 'rgba(255,255,255,0.18)',
                  weight: isCurrent ? 2 : 1,
                  opacity: isCurrent ? 0.95 : isActive ? 0.6 : 0.4,
                  dashArray: isCurrent ? undefined : '4 6',
                  fillColor: '#fbbf24',
                  fillOpacity: isCurrent ? 0.06 : 0,
                }}
              />
            );
          })}

          <Marker position={center} icon={VICTIM_ICON} />

          {incident.responders.map((r) => {
            const bearing = hashBearing(r.id);
            const pos = offsetFrom({ lat, lng }, Math.min(r.distance, 1800), bearing);
            return <Marker key={r.id} position={pos} icon={RESPONDER_ICON} />;
          })}
        </MapContainer>

        {/* HUD overlays */}
        <div className="pointer-events-none absolute left-5 top-5 z-[400] flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-950/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-300 backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          Tactical view · live
        </div>
        <div className="pointer-events-none absolute right-5 top-5 z-[400] rounded-full border border-zinc-800/80 bg-zinc-950/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400 backdrop-blur-md">
          {lat.toFixed(4)}°N · {lng.toFixed(4)}°E
        </div>
        <div className="pointer-events-none absolute bottom-5 left-5 z-[400] flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.22em]">
          {tiers.map(({ tier, radius }) => {
            const isActive = incident.tier >= tier;
            return (
              <div
                key={tier}
                className={`flex items-center gap-2 ${isActive ? 'text-amber-300' : 'text-zinc-600'}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-amber-400' : 'bg-zinc-700'}`}
                />
                Tier {tier} · {radius < 1000 ? `${radius}m` : `${radius / 1000}km`}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResponderRoster({ incident, responded }: { incident: Incident; responded: boolean }) {
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
          {incident.responders.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-800 bg-zinc-950 text-xs">
                  {r.name[0]}
                </div>
                <div>
                  <p className="text-sm text-zinc-100">{r.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    {r.distance}m away · ack {timeAgo(r.acknowledgedAt)}
                  </p>
                </div>
              </div>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={1.6} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EscalationTimeline({ incident }: { incident: Incident }) {
  return (
    <div className="border-t border-zinc-800/60 px-10 py-6">
      <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Escalation chain</p>
      <ol className="mt-5 space-y-3">
        {incident.escalationLog.map((step, i) => (
          <li key={i} className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.16em]">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-amber-400/40 text-amber-300">
              {step.tier}
            </span>
            <span className="text-zinc-400">{formatTime(step.at)}</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-300">Tier {step.tier}</span>
            <span className="text-zinc-500">· radius {step.radius}m</span>
          </li>
        ))}
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
          {log.map((e) => (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`rounded-xl border-l-2 bg-zinc-900/30 px-4 py-3 text-[12px] leading-snug ${kindStyles[e.kind]}`}
            >
              <p className="text-zinc-100">{e.message}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {formatTime(e.at)}
              </p>
            </motion.div>
          ))}
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
