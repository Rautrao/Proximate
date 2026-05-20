export const ESCALATION_TIERS = [
  { tier: 1, radius: 500,  label: '500m', timeoutMs: 60_000, color: '#F97316' },
  { tier: 2, radius: 1000, label: '1km',  timeoutMs: 60_000, color: '#EF4444' },
  { tier: 3, radius: 2000, label: '2km',  timeoutMs: Infinity, color: '#B91C1C' },
] as const;

export type EscalationTier = typeof ESCALATION_TIERS[number];

export const SHAKE_THRESHOLD = 1.8;     // g-force delta to register one shake
export const SHAKE_COUNT_NEEDED = 3;    // shakes within window to trigger
export const SHAKE_WINDOW_MS = 1500;    // rolling window for shake counting
export const HOLD_DURATION_MS = 1500;   // hold time on SOS button to trigger
export const CANCEL_GRACE_SECONDS = 10; // seconds the large cancel button is shown
