import { User, type IUser } from '../models/User';

type NearbyUser = Pick<IUser, '_id' | 'name' | 'fcmToken'>;

/**
 * Returns active users within radiusMeters of (lat, lng),
 * excluding the user who triggered the SOS.
 * Uses MongoDB 2dsphere index for O(log n) geospatial lookup.
 */
export async function getNearbyActiveUsers(
  lat: number,
  lng: number,
  radiusMeters: number,
  excludeUserId: string
): Promise<NearbyUser[]> {
  return User.find({
    _id: { $ne: excludeUserId },
    isActive: true,
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusMeters,
      },
    },
  }).select('_id name fcmToken');
}

/**
 * Upserts the user's current GPS position and marks them online.
 * Called on every location:update Socket.IO event (~every 30s from client).
 */
export async function updateUserLocation(
  userId: string,
  lat: number,
  lng: number
): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    location: { type: 'Point', coordinates: [lng, lat] },
    isActive: true,
    lastSeen: new Date(),
  });
}

/**
 * Marks user offline. Called when all their sockets disconnect.
 */
export async function markUserInactive(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { isActive: false });
}

/**
 * Haversine distance in metres between two lat/lng points.
 * Used to attach approximate distance to responder ack events.
 */
export function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
