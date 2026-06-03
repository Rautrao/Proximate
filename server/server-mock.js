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
const otpCodes = new Map(); // target -> { code, expiresAt }
let nextId = 1;
let incidentSeq = 1;

// In dev / coursework we don't actually call Twilio or SendGrid. Any code the
// user enters of length 6 with a matching target is accepted; the convenience
// constant below is what the UI hints to the user so they don't have to read
// the server log. Phase 3 will swap this for a real SMS provider.
const DEV_OTP = '123456';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/incidents', (_req, res) => {
  res.json([...incidents.values()]);
});

app.post('/api/auth/register', (req, res) => {
  const {
    name,
    phone,
    password,
    email,
    gender,
    bloodGroup,
    role = 'citizen',
    emergencyContacts = [],
  } = req.body;
  if (!name || !phone || !password)
    return res.status(400).json({ error: 'Name, phone, and password are required' });
  if (!['citizen', 'responder', 'police'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });
  if (users.has(phone))
    return res.status(409).json({ error: 'Phone already registered' });

  const id = String(nextId++);
  const record = {
    id,
    name,
    phone,
    password,
    email,
    gender,
    bloodGroup,
    role,
    emergencyContacts,
  };
  users.set(phone, record);
  const token = jwt.sign({ userId: id, role }, SECRET, { expiresIn: '30d' });
  const { password: _pw, ...safe } = record;
  res.status(201).json({ ...safe, token });
});

app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  const user = users.get(phone);
  if (!user || user.password !== password)
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id, role: user.role }, SECRET, { expiresIn: '30d' });
  const { password: _pw, ...safe } = user;
  res.json({ ...safe, token });
});

app.post('/api/auth/fcm-token', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/otp/send', (req, res) => {
  const { channel, target } = req.body || {};
  if (!channel || !target) return res.status(400).json({ error: 'channel and target are required' });
  if (!['sms', 'email'].includes(channel))
    return res.status(400).json({ error: 'channel must be sms or email' });
  otpCodes.set(target, { code: DEV_OTP, expiresAt: Date.now() + 10 * 60 * 1000 });
  console.log(`[OTP] ${channel} → ${target} (dev code: ${DEV_OTP})`);
  res.json({ sent: true });
});

app.post('/api/auth/otp/verify', (req, res) => {
  const { target, code } = req.body || {};
  if (!target || !code) return res.status(400).json({ error: 'target and code are required' });
  const entry = otpCodes.get(target);
  if (!entry) return res.status(400).json({ error: 'No code was sent to this target' });
  if (entry.expiresAt < Date.now()) {
    otpCodes.delete(target);
    return res.status(400).json({ error: 'Code has expired — request a new one' });
  }
  if (entry.code !== code) return res.status(400).json({ error: 'Incorrect code' });
  otpCodes.delete(target);
  res.json({ verified: true });
});

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
    // Newest first — matches the socket-event prepend ordering on the
    // dashboard side, so auto-select consistently lands on a new incident.
    socket.emit(
      'responder:snapshot',
      [...incidents.values()].sort((a, b) => b.startedAt - a.startedAt)
    );

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

    // Community verification (Level 3 ISM element). Responders in the network
    // can vouch for a threat OR flag a likely false alarm. Two false-alarm
    // votes with no acks pauses the incident pending review — this is what
    // your Assignment 1 calls "Community Verification (False Alarm Filter)".
    socket.on('responder:verify', ({ incidentId }) => {
      const inc = incidents.get(incidentId);
      if (!inc) return;
      inc.verifiedBy = inc.verifiedBy || [];
      if (!inc.verifiedBy.includes(socket.id)) {
        inc.verifiedBy.push(socket.id);
        io.to('responders').emit('incident:update', inc);
        io.to(`user:${inc.userId}`).emit('sos:verification_update', {
          incidentId,
          verifications: inc.verifiedBy.length,
          falseAlarmVotes: (inc.flaggedBy || []).length,
        });
        console.log(`[VERIFY] ${socket.data.responderName} → ${incidentId} (${inc.verifiedBy.length} total)`);
      }
    });
    socket.on('responder:flag_false_alarm', ({ incidentId }) => {
      const inc = incidents.get(incidentId);
      if (!inc) return;
      inc.flaggedBy = inc.flaggedBy || [];
      if (!inc.flaggedBy.includes(socket.id)) {
        inc.flaggedBy.push(socket.id);
        // 2+ false-alarm votes AND no responders → pause escalation
        if (inc.flaggedBy.length >= 2 && (inc.responders || []).length === 0) {
          inc.pendingVerification = true;
        }
        io.to('responders').emit('incident:update', inc);
        io.to(`user:${inc.userId}`).emit('sos:verification_update', {
          incidentId,
          verifications: (inc.verifiedBy || []).length,
          falseAlarmVotes: inc.flaggedBy.length,
        });
        console.log(`[FALSE-ALARM] ${socket.data.responderName} → ${incidentId} (${inc.flaggedBy.length} total)`);
      }
    });

    // Follow-up event sent by the dashboard once it resolves a real road-network
    // route via OSRM. We relay it straight to the victim's socket room so the
    // citizen UI can show "Officer Mehta · ETA 4 min" instead of just a name.
    socket.on('responder:eta', ({ incidentId, responderId, routeDistanceMeters, routeDurationSeconds }) => {
      const inc = incidents.get(incidentId);
      if (!inc) return;
      const target = (inc.responders || []).find((r) => r.id === responderId);
      if (target) {
        target.routeDistanceMeters = routeDistanceMeters;
        target.routeDurationSeconds = routeDurationSeconds;
        io.to('responders').emit('incident:update', inc);
      }
      io.to(`user:${inc.userId}`).emit('sos:responder_eta', {
        id: responderId,
        routeDistanceMeters,
        routeDurationSeconds,
      });
      console.log(`[ETA] responder ${responderId} → ${routeDistanceMeters}m / ${routeDurationSeconds}s`);
    });

    // WebRTC signaling: dashboard side. The dashboard knows the citizen's
    // userId from the offer payload — we just relay back to their user room.
    socket.on('webrtc:answer', ({ userId, sdp }) => {
      io.to(`user:${userId}`).emit('webrtc:answer', {
        responderId: socket.id,
        sdp,
      });
    });
    socket.on('webrtc:ice', ({ userId, candidate }) => {
      io.to(`user:${userId}`).emit('webrtc:ice', {
        responderId: socket.id,
        candidate,
      });
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

  // WebRTC signaling: citizen side. The citizen doesn't know the server's
  // incident ID, so we derive the active incident from this socket's userId.
  function activeIncidentForCitizen() {
    return [...incidents.values()].find(
      (i) => i.userId === uid && i.status === 'active'
    );
  }
  socket.on('webrtc:offer', ({ sdp, responderId }) => {
    const inc = activeIncidentForCitizen();
    if (!inc) return;
    const payload = { incidentId: inc.id, userId: uid, sdp };
    if (responderId) io.to(responderId).emit('webrtc:offer', payload);
    else io.to('responders').emit('webrtc:offer', payload);
  });
  socket.on('webrtc:ice', ({ candidate, responderId }) => {
    const inc = activeIncidentForCitizen();
    if (!inc) return;
    const payload = { incidentId: inc.id, userId: uid, candidate };
    if (responderId) io.to(responderId).emit('webrtc:ice', payload);
    else io.to('responders').emit('webrtc:ice', payload);
  });

  socket.on('disconnect', () => console.log(`[socket] disconnected userId=${uid}`));
});

httpServer.listen(PORT, () =>
  console.log(`Mock server running on http://localhost:${PORT}`)
);
