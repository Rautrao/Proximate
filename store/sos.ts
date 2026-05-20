import { create } from 'zustand';

export type SOSStatus = 'idle' | 'active' | 'cancelled';

export interface Responder {
  id: string;
  name: string;
  distance: number;
  acknowledgedAt: number;
}

interface SOSState {
  status: SOSStatus;
  currentTier: number;
  responders: Responder[];
  triggeredAt: number | null;
  setStatus: (status: SOSStatus) => void;
  setTier: (tier: number) => void;
  addResponder: (responder: Responder) => void;
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
  reset: () =>
    set({ status: 'idle', currentTier: 1, responders: [], triggeredAt: null }),
}));
