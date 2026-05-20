import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './config/db';
import authRoutes from './routes/auth';
import sosRoutes from './routes/sos';
import { initSocket } from './socket';

const PORT = Number(process.env.PORT ?? 3000);

async function bootstrap(): Promise<void> {
  await connectDB();

  const app = express();

  app.use(cors());
  app.use(express.json());

  // REST routes
  app.use('/api/auth', authRoutes);
  app.use('/api/sos', sosRoutes);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket'],
  });

  initSocket(io);

  httpServer.listen(PORT, () => {
    console.log(`Proximate server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
