import type { Socket } from 'socket.io';

export interface AuthSocket extends Socket {
  data: {
    userId: string;
    name: string;
  };
}

export interface Coords {
  lat: number;
  lng: number;
}

export interface SOSEscalatePayload {
  tier: number;
  radius: number;
  location: Coords;
}

export interface ResponderAckPayload {
  incidentId: string;
}
