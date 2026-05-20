import admin from 'firebase-admin';
import twilio from 'twilio';

// ─── Firebase (FCM) ──────────────────────────────────────────────────────────

let fcmReady = false;

function ensureFCM(): boolean {
  if (fcmReady) return true;
  const { FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
    return false;
  }
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  fcmReady = true;
  return true;
}

/**
 * Sends a push notification to a single device.
 * Silently skips if Firebase credentials are not configured.
 */
export async function sendPush(
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<void> {
  if (!ensureFCM()) return;
  try {
    await admin.messaging().send({ token: fcmToken, notification: { title, body }, data });
  } catch (err) {
    // Token may be stale — log but don't crash
    console.warn('[FCM] send failed:', (err as Error).message);
  }
}

// ─── Twilio (SMS) ─────────────────────────────────────────────────────────────

/**
 * Sends an SMS via Twilio.
 * Silently skips if Twilio credentials are not configured.
 */
export async function sendSMS(toPhone: string, message: string): Promise<void> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) return;
  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: message,
      from: TWILIO_FROM_NUMBER,
      to: toPhone,
    });
  } catch (err) {
    console.warn('[Twilio] send failed:', (err as Error).message);
  }
}
