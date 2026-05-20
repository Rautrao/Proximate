/**
 * Minimal in-memory dev server — no MongoDB required.
 * Handles auth + Socket.IO for the citizen mobile app and the responder portal.
 */
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const SECRET = 'dev-secret';
const PORT = 3000;

const users = new Map();
const incidents = new Map();
let nextId = 1;
let incidentSeq = 1;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/incidents', (_req, res) => {
  res.json([...incidents.values()]);
});

app.post('/api/auth/register', (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password)
    return res.status(400).json({ error: 'All fields required' });
  if (users.has(phone))
    return res.status(409).json({ error: 'Phone already registered' });

  const id = String(nextId++);
  users.set(phone, { id, name, phone, password });
  const token = jwt.sign({ userId: id }, SECRET, { expiresIn: '30d' });
  res.status(201).json({ id, name, phone, token });
});

app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  const user = users.get(phone);
  if (!user || user.password !== password)
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '30d' });
  res.json({ id: user.id, name: user.name, phone: user.phone, token });
});

app.post('/api/auth/fcm-token', (_req, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' }, transports: ['websocket'] });

io.use((socket, next) => {
  const role = socket.handshake.auth?.role;
  if (role === 'responder') {
    socket.data.role = 'responder';
    socket.data.responderName = socket.handshake.auth?.name || 'Responder';
    return next();
  }
  try {
    const payload = jwt.verify(socket.handshake.auth?.token, SECRET);
    socket.data.userId = payload.userId;
    socket.data.role = 'citizen';
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  if (socket.data.role === 'responder') {
    socket.join('responders');
    console.log(`[socket] responder connected name=${socket.data.responderName}`);
    socket.emit('responder:snapshot', [...incidents.values()]);

    socket.on('responder:ack', ({ incidentId, distance = 280 }) => {
      const inc = incidents.get(incidentId);
      if (!inc) return;
      const responder = {
        id: socket.id,
        name: socket.data.responderName,
        distance,
        acknowledgedAt: Date.now(),
      };
      inc.responders = [...(inc.responders || []), responder];
      io.to('responders').emit('incident:update', inc);
      io.to(`user:${inc.userId}`).emit('sos:responder_ack', responder);
      console.log(`[ACK] ${responder.name} → incident ${incidentId}`);
    });
    return;
  }

  const uid = socket.data.userId;
  socket.join(`user:${uid}`);
  console.log(`[socket] citizen connected userId=${uid}`);

  socket.on('location:update', () => {});

  socket.on('sos:escalate', ({ tier, radius, location, userId }) => {
    const id = userId || uid;
    let incident = [...incidents.values()].find(
      (i) => i.userId === id && i.status === 'active'
    );
    if (!incident) {
      const victimName = [...users.values()].find((u) => u.id === id)?.name || 'Unknown';
      incident = {
        id: `inc-${incidentSeq++}`,
        userId: id,
        victimName,
        status: 'active',
        tier,
        radius,
        location: location || { lat: 12.9716, lng: 77.5946 },
        startedAt: Date.now(),
        escalationLog: [],
        responders: [],
      };
      incidents.set(incident.id, incident);
    }
    incident.tier = tier;
    incident.radius = radius;
    if (location) incident.location = location;
    incident.escalationLog.push({ tier, radius, at: Date.now() });

    io.to('responders').emit('incident:update', incident);
    socket.emit('sos:escalate_ack', { tier, notifiedCount: 0, incidentId: incident.id });
    console.log(`[SOS] tier=${tier} radius=${radius}m userId=${id}`);
  });

  socket.on('sos:cancel', ({ userId }) => {
    const id = userId || uid;
    const incident = [...incidents.values()].find(
      (i) => i.userId === id && i.status === 'active'
    );
    if (incident) {
      incident.status = 'cancelled';
      incident.endedAt = Date.now();
      io.to('responders').emit('incident:cancelled', { id: incident.id });
    }
    console.log(`[SOS] cancelled userId=${id}`);
  });

  socket.on('disconnect', () => console.log(`[socket] disconnected userId=${uid}`));
});

httpServer.listen(PORT, () =>
  console.log(`Mock server running on http://localhost:${PORT}`)
);
