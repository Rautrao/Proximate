import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const SOCKET_URL =
  (Constants.expoConfig?.extra?.socketUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_SOCKET_URL ??
  'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(token: string): Socket {
  // If the token changed (e.g. after re-login) tear down the old connection
  // so the server gets a fresh auth handshake with the new JWT.
  if (socket?.connected && (socket.auth as { token?: string })?.token !== token) {
    socket.disconnect();
    socket = null;
  }
  const s = getSocket();
  s.auth = { token };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
