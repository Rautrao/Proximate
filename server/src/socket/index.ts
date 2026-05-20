import type { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { updateUserLocation, markUserInactive } from '../services/geo';
import { registerSOSHandlers } from './sos';

export function initSocket(io: Server): void {
  // ─── Auth middleware ────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;

    // Each user has a dedicated room — used to target push alerts
    socket.join(`user:${userId}`);
    console.log(`[Socket] connected  userId=${userId}  socketId=${socket.id}`);

    // Register all SOS event handlers
    registerSOSHandlers(io, socket);

    // ─── Location updates ─────────────────────────────────────────────────────
    // Client emits this every ~30 seconds while app is foregrounded.
    // Keeps the MongoDB GeoJSON index current for proximity queries.
    socket.on(
      'location:update',
      async ({ lat, lng }: { lat: number; lng: number }) => {
        try {
          await updateUserLocation(userId, lat, lng);
        } catch (err) {
          console.error('[Socket] location:update error', err);
        }
      }
    );

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] disconnected userId=${userId} reason=${reason}`);

      // Wait 30s before marking inactive — handles brief reconnects gracefully
      setTimeout(async () => {
        const activeSockets = await io.in(`user:${userId}`).fetchSockets();
        if (activeSockets.length === 0) {
          await markUserInactive(userId);
        }
      }, 30_000);
    });
  });
}
