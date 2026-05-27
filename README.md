# Proximate

**A proximity-first emergency response system.** Mobile citizen app + real-time responder dashboard + marketing site, built end-to-end as the prototype for our DS2000 Systems Thinking for Design project.

**Course:** DS2000 — Systems Thinking for Design · IIITDM Kancheepuram
**Team (Group 13):** Ambadas Rautrao (CS24I1014) · Yashvanth S (CS24I1029) · P. Y. Nithillakrishi (CS24I1039) · Mukund Shah (CS24I1042)
**Repo:** https://github.com/Rautrao/Proximate

---

## The problem we're solving

> *"As the incidence of sexual assault and murder cases increases in India, the safety of people in public spaces is less, even during evening hours. Conventional response such as reporting incidents to police, causes delay due to communication and strict procedures. A more effective and quick solution would be to implement a proximity-based app, where individuals in the immediate proximity of a potential victim are notified in real time."*
>
> — Assignment 1, problem statement

Conventional emergency response is centralised and slow. Proximate flips that: the people closest to a victim — geographically — are the people first notified, because they can reach the scene fastest. Police, emergency contacts, and law enforcement still get the alert, but in parallel rather than sequentially.

---

## What we built (vs. what we wrote in the design docs)

The system implements every primary functional element identified in our **Assignment 1 ISM analysis**:

| ISM Element (Assignment 1) | Level | Built? | Where |
|---|---|---|---|
| Incident Detected (Trigger Alert) | 1 (Base) | ✅ | Long-press, shake, triple-press volume — [`hooks/useSOSEngine.ts`](hooks/useSOSEngine.ts), [`hooks/useShakeTrigger.ts`](hooks/useShakeTrigger.ts), [`hooks/useVolumeButtonTrigger.ts`](hooks/useVolumeButtonTrigger.ts) |
| Notify Nearby Users (Community Network) | 2 (Mid) | ✅ | Socket.IO `incident:update` broadcast to `responders` room — [`server/server-mock.js`](server/server-mock.js) |
| Alert Emergency Contacts | 2 (Mid) | ✅ | Contacts CRUD store — [`store/contacts.ts`](store/contacts.ts), [`app/(tabs)/contacts.tsx`](app/(tabs)/contacts.tsx). SMS wiring is in `server/src/services/notify.ts` (production backend) |
| Send GPS & Details to Police | 2 (Mid) | ✅ | Nearest OSM `amenity=police` looked up via Overpass API → OSRM route — [`responder/src/App.tsx`](responder/src/App.tsx) (`findNearestPoliceStation`) |
| Privacy Safeguards (User Opt-In) | 2 (Mid) | ✅ | Video toggle, persisted via Zustand — [`store/preferences.ts`](store/preferences.ts), [`app/(tabs)/index.tsx`](app/(tabs)/index.tsx) |
| Community Verification (False Alarm Filter) | 3 (Top) | ✅ | Verify / Flag-False-Alarm buttons on dashboard; 2+ false-alarm votes pauses escalation — [`responder/src/App.tsx`](responder/src/App.tsx) `VerificationBar` |
| Rapid Response Coordination (Integrates All Streams) | 3 (Top) | ✅ | Responder dashboard fuses incident list + tactical map + activity feed + live video + ETA + escalation timeline into a single operator view |

It also implements the **first-order and second-order feedback loops** from our **Assignment 2** cybernetics analysis:

| Feedback Loop (Assignment 2) | Built? | Where |
|---|---|---|
| Alert → Response → Safety (Balancing) | ✅ | Citizen sees responder ack within seconds via `sos:responder_ack` |
| Escalation if no response within *t* (Balancing) | ✅ | 60s timer per tier — [`hooks/useSOSEngine.ts`](hooks/useSOSEngine.ts), [`constants/escalation.ts`](constants/escalation.ts) |
| Increase alert radius (Balancing) | ✅ | 500m → 1km → 2km adaptive escalation |
| "Help is on the way" updates (Reassurance) | ✅ | ETA pill on citizen screen pushed back from dashboard via `sos:responder_eta` |
| Automatic fallback on delivery failure | ✅ | GPS fallback (Bangalore default if denied), camera fallback (canvas-mock stream if `getUserMedia` fails) |
| False Alert → Trust (Reinforcing — destabilizing) | ✅ Mitigated | Community Verification damps this loop before it destabilises the system |
| Second-order: system learns from past incidents | ❌ | Out of scope for prototype (the forensic incident log captures the data; analysis is future work) |

---

## System architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  CITIZEN MOBILE APP                  BACKEND                                │
│  (Expo / React Native)               (Node.js + Socket.IO)                  │
│  ─────────────────────               ──────────────────                     │
│  • Auth (JWT)                                                               │
│  • SOS triggers ─────────emit────►   • Auth REST                            │
│    – Long press                      • Incident store (in-memory)           │
│    – Shake                           • Socket.IO rooms:                     │
│    – Volume key                        – user:<id>                          │
│  • Live GPS                            – responders                         │
│  • WebRTC offer ◄─────signal────►    • Signaling relay (offer/answer/ICE)   │
│  • ETA receive ◄──────────────       • OSRM ETA relay                       │
│                                                                             │
│         ▲                                  ▲                                │
│         │                                  │                                │
│         │  sos:responder_ack               │  responder:ack                 │
│         │  sos:responder_eta               │  responder:verify              │
│         │                                  │  responder:flag_false_alarm    │
│         │                                  │  webrtc:answer / ice           │
│         │                                  │                                │
│         └─────────  RESPONDER DASHBOARD  ──┘                                │
│                     (Vite + React + Leaflet)                                │
│                     • Incident list (newest first)                          │
│                     • Tactical map (OSM tiles, OSRM road route)             │
│                     • Live video panel (HTML <video>)                       │
│                     • Activity feed + escalation timeline                   │
│                     • Verify / Flag-False-Alarm controls                    │
│                     • Animated responder pip (tweens along route)           │
│                                                                             │
│                                                                             │
│  LANDING PAGE                                                               │
│  (Vite + React + Framer Motion)                                             │
│  • Hero · Features grid · Mock phone preview · Waitlist                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why three separate React projects?** The citizen and responder have fundamentally different user contexts, devices, and threat models. The citizen runs on a phone under stress (panic UX); the responder runs on a desk in front of an operator. Splitting them lets each app optimise for its own context — typography, density, input model — without compromising the other.

---

## Demo: the two-screen story

This is the single demo we run for the jury — citizen on one window, dashboard on another:

1. **Citizen** registers / logs in (auto-generated phone for the demo)
2. **Citizen** triggers SOS — *long-press the button 1.5s, shake the phone, OR triple-press volume key*
3. **Backend** broadcasts the incident to all responders via Socket.IO
4. **Dashboard** lights up — new incident card slides into the left rail, tactical map flies to victim location
5. **Operator** clicks **I'm responding** — emerald pill appears, route polyline draws on real Bangalore streets
6. **Dashboard** queries OSM for nearest police station, OSRM for the road route, computes ETA
7. **Dashboard** pushes ETA back through the backend
8. **Citizen** sees *"Officer Mehta · Patrol 04 · 1.7 km away · ETA 3 min"* on her phone
9. **Citizen's camera** (or mock canvas if camera unavailable) streams live to the dashboard via WebRTC
10. **Animated responder pip** crawls along the route toward the victim, in real-time

If at any point the response stalls past 60s, the system auto-escalates from 500m → 1km → 2km (police priority), with the dashboard flashing into a red "POLICE PRIORITY ESCALATION" banner state.

---

## Features

### Citizen mobile app
- Long-press SOS button (1.5s hold)
- Shake-to-trigger (3 shakes within 1.5s, ≥1.8g delta)
- Triple-press volume key (Assignment 2 primary trigger; SPACE on web demo)
- Live GPS with 1.5s timeout + Bangalore fallback
- Live WebRTC video stream (camera → dashboard)
- Canvas-based mock video fallback when camera unavailable (Windows lock, no device, denied)
- Privacy toggle for video (Home → "Video on/off" pill)
- Emergency Contacts CRUD (add / remove / persisted)
- Settings page (profile, alert preferences, notifications)
- Real-time responder ack + ETA display
- Cancel SOS with 10s grace period (button stays visible but fades)
- Haptic feedback on trigger and ack (native only; web-guarded)

### Responder dashboard
- Real OpenStreetMap tiles (CartoDB Dark Matter via Leaflet)
- Nearest police station auto-lookup (Overpass API)
- OSRM road-network routing from police station to victim
- Animated responder pip tweening along the route in real-time
- Three concentric escalation tier rings (500m / 1km / 2km) drawn at geographic scale
- Tier 3 police-priority visual treatment (red banner, red ring, red incident cards)
- Community verification: Verify / Flag-False-Alarm buttons with vote tracking
- Live video panel rendering the citizen's MediaStream
- Activity feed with colour-coded entries (incident / escalation / ack / police priority / cancel)
- Forensic escalation timeline (every tier change timestamped per incident)
- Demo mode that auto-generates synthetic incidents (for jury fallback)
- Responder card shows real driving distance + ETA + dispatching station name

### Backend
- JWT register / login REST
- Socket.IO rooms (`user:<id>` for victim direct messages, `responders` for dashboard broadcast)
- Incident lifecycle (escalate / cancel / verify / flag-false-alarm)
- WebRTC signaling relay (offer / answer / ICE candidates)
- ETA relay back to victim after dashboard's OSRM resolves
- Production backend (`server/src/`) with MongoDB GeoJSON `$nearSphere`, Twilio SMS, Firebase Admin SDK push — code complete, demo uses the simpler in-memory mock

### Landing page
- "Safety. Redefined." hero
- 4-feature grid (Proximity / Haptic / Automated / Biometric)
- Animated mock mobile interface
- Waitlist email capture
- Strict monochrome with single amber accent

---

## Tech stack

Tracks **Assignment 1's "Anticipated Technical Skills"** list closely:

| Layer | Planned (Assignment 1) | Actually built |
|---|---|---|
| Mobile app | React Native + react-native-geolocation-service + react-native-webrtc + FCM | **Expo SDK 52 + expo-router + expo-location + browser WebRTC (web) + zustand** (FCM stubbed) |
| Backend | Node.js + Express + Socket.IO + Firebase Admin SDK + WebRTC signaling | **Node.js + Express + Socket.IO** (mock); production stub in `server/src/` includes the Firebase Admin SDK |
| Database | MongoDB with GeoJSON | **MongoDB schema with `2dsphere` index** in `server/src/models/User.ts` (in-memory Map in mock for demo) |
| Video streaming | WebRTC self-hosted | **Browser-native RTCPeerConnection with STUN** (Google's public STUN) |
| Notifications | FCM + Twilio SMS + SendGrid email | **Twilio integration code in `server/src/services/notify.ts`** (mock skips); FCM placeholder; SendGrid not built |
| Routing engine (new — not in original brief) | — | **OSRM public demo + Overpass API for OSM police lookup** |
| Hosting | AWS EC2 / Render + MongoDB Atlas | **Local for now** — deployment is the next step |

---

## How to run locally

Three independent services. Open three terminals:

```bash
# Terminal 1 — Backend (port 3000)
node server/server-mock.js

# Terminal 2 — Citizen mobile app (port 8081)
npm install
npx expo start --web --port 8081

# Terminal 3 — Responder dashboard (port 5174)
cd responder
npm install
npm run dev
```

Optional 4th terminal for the marketing site:

```bash
# Terminal 4 — Landing page (port 5173)
cd landing
npm install
npm run dev
```

Then open in your browser:

| URL | What |
|---|---|
| http://localhost:8081 | Citizen app — register, then trigger SOS |
| http://localhost:5174 | Responder dashboard — click "I'm responding" |
| http://localhost:5173 | Landing page |
| http://localhost:3000/health | Backend health check |

For an instant demo on the dashboard without the mobile app, toggle **Demo mode** in the header — synthetic incidents will spawn and escalate every ~18 seconds.

---

## Verifying the system end-to-end

Several Playwright scripts in the repo exercise specific demo paths. Each one boots the backend if needed, drives the UIs through real interaction, and asserts on the resulting state:

| Script | What it proves |
|---|---|
| `live-demo.cjs` | Full two-screen flow: citizen SOS → dashboard ack → citizen ETA received |
| `webrtc-test.cjs` | Real WebRTC video frames flow from citizen browser to dashboard `<video>` element |
| `mock-video-test.cjs` | Canvas-based video fallback engages when `getUserMedia` is denied |
| `responder/tier3-test.cjs` | Tier 3 escalation triggers the red "POLICE PRIORITY" UI |
| `responder/route-test.cjs` | OSRM road-network polyline draws on the dashboard map |
| `responder/animation-test.cjs` | Responder pip animates along the route (measured pixel delta over 16s) |

Run any of them with `node <script>.cjs` while the services are up.

---

## Project structure

```
Proximate/
├── app/                      Expo Router screens
│   ├── (auth)/               Login + register
│   ├── (tabs)/               Home (SOS) · Contacts · Settings
│   └── sos-active.tsx        Full-screen emergency overlay
├── components/               SOSButton · EscalationRing · ResponderList
├── hooks/
│   ├── useSOSEngine.ts       SOS state machine + escalation timers
│   ├── useShakeTrigger.ts    Accelerometer shake detection
│   └── useVolumeButtonTrigger.ts   Triple-press volume key (Assignment 2 trigger)
├── store/                    Zustand stores (auth, sos, contacts, preferences)
├── services/
│   ├── api.ts                REST client (register / login / FCM token)
│   ├── socket.ts             Socket.IO singleton
│   ├── location.ts           GPS wrapper with permission handling
│   └── webrtc.ts             Camera capture + RTCPeerConnection per responder
├── constants/escalation.ts   Tier radii, timeouts, thresholds
│
├── server/
│   ├── server-mock.js        In-memory backend used for the demo
│   └── src/                  Production backend (TypeScript, MongoDB, Twilio, Firebase)
│       ├── models/           User · SOSIncident
│       ├── services/         geo · notify
│       ├── socket/           sos handler · index
│       └── routes/           auth
│
├── responder/                Responder dashboard (Vite + React + Leaflet)
│   ├── src/
│   │   ├── App.tsx           Single-file dashboard (all components)
│   │   └── index.css         Leaflet + Tailwind + custom marker styles
│   └── *-test.cjs            Playwright verification scripts
│
├── landing/                  Marketing site (Vite + React + Framer Motion)
│   └── src/App.tsx           Single-file landing page
│
└── live-demo.cjs             Two-screen E2E verification
```

---

## Honest limitations

What we did NOT build (transparent for the jury):

- **Voice command activation** — listed in our Assignment 3 Alterables, not implemented
- **Background audio/video recording** — we stream live but don't persist a local recording
- **Real FCM push notifications** — the placeholder is in `services/api.ts`; we never integrated `expo-notifications`
- **SendGrid email alerts** — not built
- **Volunteer vetting / reputation system** — listed in Assignment 3, not built
- **Second-order feedback (system learns from past incidents)** — the forensic incident log captures the data needed; the analysis layer is future work
- **Deployment to AWS / Render** — runs locally for now
- **Native shake & volume key on iOS/Android** — currently web-only via Expo Web; the hooks have `Platform.OS === 'web'` guards so swapping in `react-native-volume-manager` and the native Accelerometer is mechanical

---

## What's next

In priority order for our final submission:

1. **Deploy** backend (Render) + dashboard + landing (Vercel) for a shareable URL
2. **Record a 60-second pitch video** capturing the two-screen demo
3. **Test on a real phone** via Expo Go (shake + volume keys + real GPS)
4. **Wire Twilio SMS** into the active mock so emergency contacts actually get the alert

---

## Acknowledgements

- **OpenStreetMap contributors** for the base map data
- **CARTO** for the dark-mode tile style
- **OSRM** public demo server for road-network routing
- **Overpass API** for OSM querying
- Course faculty for DS2000 (Systems Thinking for Design), IIITDM
