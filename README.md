# Proximate — Women's Safety Proximity Alert App

A proximity-first emergency response mobile app built with React Native (Expo).

## What makes it different from existing apps (e.g. withU)

| Feature | withU | Proximate |
|---|---|---|
| Alert radius | Flat 5km | 500m → 1km → 2km (adaptive) |
| Live video | None | WebRTC stream (watermarked) |
| Trigger | On-screen button only | Hold button OR shake phone |
| False alarm filter | None | Community verification + grace period |
| Evidence chain | None | Encrypted video + GPS audit trail |

## Project structure

```
app/
  (auth)/       login + register screens
  (tabs)/       home (SOS), contacts, settings
  sos-active    full-screen emergency overlay
components/
  SOSButton       hold-to-trigger with pulse animation
  EscalationRing  animates radius tier changes
  ResponderList   real-time list of nearby responders
hooks/
  useShakeTrigger   accelerometer shake detection
  useSOSEngine      SOS state machine + escalation timers
store/            Zustand stores (auth, SOS state, contacts)
services/         Socket.IO client, GPS, mock API
constants/        escalation tiers, thresholds
```

## Setup

```bash
cp .env.example .env
# edit .env with your backend URL

npm install
npx expo start
```

Scan the QR code with Expo Go (Android/iOS).

## SOS flow

1. **Trigger** — hold SOS button 1.5s, or shake phone 3× rapidly
2. **Active** — app notifies users within 500m, shares live GPS, starts video
3. **Escalate** — if no responder acknowledges within 60s, radius expands to 1km, then 2km with police priority
4. **Cancel** — large cancel button shown for 10s after trigger; fades but remains tappable

## Tech stack

- **Mobile**: React Native + Expo SDK 52, expo-router, expo-sensors
- **State**: Zustand + AsyncStorage persistence
- **Real-time**: Socket.IO client
- **Location**: expo-location
- **Backend** (next step): Node.js + Express + Socket.IO + MongoDB GeoJSON
