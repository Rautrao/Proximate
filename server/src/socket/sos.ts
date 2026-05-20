import type { Server, Socket } from 'socket.io';
import { User } from '../models/User';
import { SOSIncident } from '../models/SOSIncident';
import { getNearbyActiveUsers } from '../services/geo';
import { sendPush, sendSMS } from '../services/notify';

export function registerSOSHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  // ─── sos:escalate ──────────────────────────────────────────────────────────
  // Fired by the client on every tier change.
  // Queries nearby users, broadcasts the alert, logs the escalation.
  socket.on(
    'sos:escalate',
    async ({ tier, radius, location }: { tier: number; radius: number; location: { lat: number; lng: number } }) => {
      try {
        const { lat, lng } = location;

        // Find or create the active incident
        let incident = await SOSIncident.findOne({ userId, status: 'active' });
        if (!incident) {
          incident = await SOSIncident.create({
            userId,
            location: { type: 'Point', coordinates: [lng, lat] },
          });
          // Victim joins the incident room to receive responder acks
          socket.join(`sos:${incident.id}`);
        } else {
          // Update location on each escalation (victim may be moving)
          incident.location.coordinates = [lng, lat];
        }

        incident.currentTier = tier;
        incident.escalationLog.push({ tier, radius, notifiedCount: 0, at: new Date() });
        await incident.save();

        const nearbyUsers = await getNearbyActiveUsers(lat, lng, radius, userId);

        const alertPayload = {
          incidentId: incident.id,
          location: { lat, lng },
          tier,
          radius,
        };

        let notifiedCount = 0;

        for (const nearby of nearbyUsers) {
          const targetRoom = `user:${nearby._id.toString()}`;
          const activeSockets = await io.in(targetRoom).fetchSockets();

          if (activeSockets.length > 0) {
            // User is online — real-time alert
            io.to(targetRoom).emit('sos:alert', alertPayload);
            notifiedCount++;
          } else if (nearby.fcmToken) {
            // User is offline — FCM push
            await sendPush(
              nearby.fcmToken,
              '🚨 Emergency Nearby',
              `Someone needs help within ${radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}. Open Proximate to respond.`,
              {
                incidentId: incident.id,
                lat: String(lat),
                lng: String(lng),
                tier: String(tier),
              }
            );
            notifiedCount++;
          }
        }

        // Tier 1 only: SMS emergency contacts + police placeholder
        if (tier === 1) {
          const victim = await User.findById(userId).select('name emergencyContacts');
          if (victim?.emergencyContacts?.length) {
            const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
            const smsBody =
              `EMERGENCY — ${victim.name} triggered an SOS alert on Proximate. ` +
              `Live location: ${mapsUrl}`;
            for (const contact of victim.emergencyContacts) {
              await sendSMS(contact.phone, smsBody);
            }
          }
        }

        // Update log entry with actual notified count
        const logEntry = incident.escalationLog[incident.escalationLog.length - 1];
        logEntry.notifiedCount = notifiedCount;
        await incident.save();

        socket.emit('sos:escalate_ack', {
          tier,
          notifiedCount,
          incidentId: incident.id,
        });
      } catch (err) {
        console.error('[SOS] sos:escalate error', err);
      }
    }
  );

  // ─── sos:responder_ack ──────────────────────────────────────────────────────
  // A nearby user taps "I'm responding" in their app.
  socket.on('sos:responder_ack', async ({ incidentId }: { incidentId: string }) => {
    try {
      const incident = await SOSIncident.findOne({ _id: incidentId, status: 'active' });
      if (!incident) return;

      // Avoid duplicate acks from the same responder
      const alreadyAcked = incident.responders.some(
        (r) => r.userId.toString() === userId
      );
      if (alreadyAcked) return;

      const responder = await User.findById(userId).select('name location');
      if (!responder) return;

      // Approximate responder distance from the incident
      const [incLng, incLat] = incident.location.coordinates;
      const [resLng, resLat] = responder.location.coordinates;
      const { haversineMeters } = await import('../services/geo');
      const distance = Math.round(haversineMeters(incLat, incLng, resLat, resLng));

      incident.responders.push({
        userId: responder._id,
        name: responder.name,
        distance,
        acknowledgedAt: new Date(),
      });
      await incident.save();

      // Join the incident room so this responder gets further updates
      socket.join(`sos:${incidentId}`);

      // Notify the victim (and any other responders already in the room)
      io.to(`sos:${incidentId}`).emit('sos:responder_ack', {
        id: responder._id.toString(),
        name: responder.name,
        distance,
      });
    } catch (err) {
      console.error('[SOS] sos:responder_ack error', err);
    }
  });

  // ─── sos:cancel ────────────────────────────────────────────────────────────
  socket.on('sos:cancel', async () => {
    try {
      const incident = await SOSIncident.findOneAndUpdate(
        { userId, status: 'active' },
        { status: 'cancelled', endedAt: new Date() },
        { new: true }
      );
      if (incident) {
        io.to(`sos:${incident.id}`).emit('sos:cancelled', { incidentId: incident.id });
      }
    } catch (err) {
      console.error('[SOS] sos:cancel error', err);
    }
  });
}
