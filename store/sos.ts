import { create } from 'zustand';

export type SOSStatus = 'idle' | 'active' | 'cancelled';

export interface Responder {
  id: string;
  name: string;
  distance: number;
  acknowledgedAt: number;
  // Populated by a follow-up `sos:responder_eta` event after the dashboard
  // resolves a road-network route via OSRM. May arrive seconds after the
  // initial ack — UI should treat them as optional.
  routeDistanceMeters?: number;
  routeDurationSeconds?: number;
}

interface SOSState {
  status: SOSStatus;
  currentTier: number;
  responders: Responder[];
  triggeredAt: number | null;
  setStatus: (status: SOSStatus) => void;
  setTier: (tier: number) => void;
  addResponder: (responder: Responder) => void;
  updateResponderEta: (id: string, eta: { routeDistanceMeters: number; routeDurationSeconds: number }) => void;
  reset: () => void;
}

export const useSOSStore = create<SOSState>()((set) => ({
  status: 'idle',
  currentTier: 1,
  responders: [],
  triggeredAt: null,
  setStatus: (status) =>
    set({ status, ...(status === 'active' ? { triggeredAt: Date.now() } : {}) }),
  setTier: (currentTier) => set({ currentTier }),
  addResponder: (responder) =>
    set((state) =>
      state.responders.some((r) => r.id === responder.id)
        ? state
        : { responders: [...state.responders, responder] }
    ),
  updateResponderEta: (id, eta) =>
    set((state) => ({
      responders: state.responders.map((r) =>
        r.id === id ? { ...r, ...eta } : r
      ),
    })),
  reset: () =>
    set({ status: 'idle', currentTier: 1, responders: [], triggeredAt: null }),
}));
