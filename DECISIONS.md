# Architectural & Engineering Decisions (DECISIONS.md)

Project: **Hostel Hunt** – Real-Life Location-Based Hide-and-Seek Mobile Game

This document records all architectural choices, engineering trade-offs, security and privacy models, and mathematical algorithms implemented in Hostel Hunt.

---

## 1. Tech Stack Selection: PWA + Node.js / Express + Socket.io + Leaflet

### Context & Need
The prompt suggested a PWA or Flutter/React Native app, with Firebase (Auth, Firestore, Cloud Functions) and Leaflet/Google Maps. The primary requirement was:
> *"Pick whatever gives the fastest path to a working, installable app that my friends can open on their phones, preferably with no app store required and a free or very cheap hosting tier."*

### Decision
We chose a **Progressive Web App (PWA)** built with **React 19 + TypeScript + Vite + Tailwind CSS**, backed by an authoritative **Node.js + Express + Socket.io** WebSocket server and **Leaflet / OpenStreetMap**.

### Why This is Superior to Flutter/React Native & Cloud Firebase
1. **Zero App Store Friction**: Native mobile apps (Flutter, React Native) require Google Play Console or Apple App Store developer accounts, Xcode/Android Studio toolchains, sideloading APKs, and prolonged review cycles. A PWA can be added to any iOS or Android home screen in 2 seconds via "Add to Home Screen" / "Install App".
2. **True Authoritative Server vs Client-Side Firestore Rules**:
   - In a competitive hide-and-seek game, adversary roles, exact GPS coordinates, and catch tokens must **never** be transmitted to the client.
   - While Firestore Security Rules can restrict document reads, complex dynamic location masking (e.g., jittering crewmate coordinates into blurred 35-meter uncertainty circles refreshed only every 20 seconds) is computationally expensive and slow to evaluate in Firestore rules.
   - An in-memory authoritative Node.js game engine calculates proximity, rate-limits updates, runs unbiased cryptographic role shuffles, and generates role-sanitized state payloads with sub-50ms latency.
3. **OpenStreetMap / Leaflet vs Google Maps SDK**:
   - Google Maps requires entering a credit card, generating API keys, and risking surprise billing spikes when 12+ phones emit location updates every 2-5 seconds.
   - Leaflet with CartoDB Voyager tiles is completely free, open-source, requires zero API keys, and supports dark-mode tactical maps out of the box.
4. **Zero-Configuration Deployment**:
   - The combined server can be deployed for **$0** on Render, Railway, Fly.io, or Heroku, or run locally on a hostel WiFi hotspot.

---

## 2. Security & Anti-Cheat Architecture

### 2.1 Authoritative Server-Side Role Assignment
- **Decision**: Role assignment is executed 100% server-side via an unbiased Fisher-Yates shuffle algorithm (`src/server/roleAssignment.ts`).
- **Reason**: Clients are completely untrusted. The client never supplies or influences their role.
- **Data Filtering**:
  - Crewmates receive only their own role. In their player roster, adversary roles are masked (`undefined`).
  - Hunters receive only hunter teammate identities to coordinate tactics.
  - Spectators and Hosts receive all roles.

### 2.2 Location Obfuscation & Blurred Radar Circles
- **Decision**:
  - Crewmates **never** see hunter positions on the map.
  - Hunters **never** receive real-time exact crewmate coordinates.
  - Instead, the server takes real-time crewmate coordinates and applies a pseudorandom angular offset between 30% and 75% of the configured blur radius (`blurRadiusMeters`, default 30–35m).
  - This blurred uncertainty circle is cached on the server and broadcast **only every 20 seconds**.
- **Reason**: If hunters could see live exact pins, hide-and-seek would devolve into a trivial sprint. Blurry circles inform hunters of the general wing/corridor, preserving real hide-and-seek tension.

### 2.3 Catch Mechanism: Dynamic QR Codes + Proximity Verification
- **Decision**:
  - **Primary**: Each crewmate's app displays a dynamic, cryptographically salted QR code token (`CATCH_<playerId>_<salt>`). Cornering a crewmate requires the hunter to physically point their phone camera at the screen and scan the badge.
  - **Secondary (Proximity Tag)**: If physical camera scanning is unfeasible (e.g. low lighting), the hunter can tap "Tag [Player]". The server confirms the catch **only if**:
    1. Both players have reported locations within 15 meters horizontal distance.
    2. Both players are verified to be on the **exact same floor**.
    3. Hunter is alive and target is an alive crewmate.
- **Reason**: Prevents remote catch cheating, "I saw you through the window" disputes, and GPS drift errors.

---

## 3. Indoor & Multi-Floor Problem Strategy

### Problem Statement
Indoor GPS signals degrade significantly due to concrete walls, ceilings, and electromagnetic noise (accuracy often drops to >25m). Furthermore, consumer phone GPS does not report reliable indoor floor altitude.

### Decision: Multi-Tier Hybrid Indoor Solution
1. **Synchronized Floor Quick-Bar**:
   - Host defines floor levels (e.g., Ground Floor, Floor 1, Floor 2, Floor 3, Terrace).
   - Players have a persistent top floor toggle bar `[G] [F1] [F2] [F3]`. Switching floors immediately updates server state.
2. **QR Checkpoint Anchors**:
   - Printable QR codes (e.g., `WATER_DISPENSER_GF`, `ROUTER_FLOOR_1`, `LIBRARY_LOG_F3`) can be posted at stairwell landings and common areas.
   - Scanning a checkpoint instantly locks the player's verified floor and recalibrates their coordinate anchor to high accuracy (5m confidence).
3. **Exponential Moving Average (EMA) GPS Smoothing**:
   - `GpsCoordinateSmoother` dampens sudden horizontal position jumps when indoor satellite bounce occurs.
   - Low-accuracy readings (>25m) are dynamically dampened with `alpha = 0.2`, while high-accuracy readings (<10m) respond rapidly with `alpha = 0.7`.
4. **Floor-Aware Geofencing & Proximity**:
   - Proximity warnings and red zones respect floor metadata. For example, a "Terrace Parapet" danger zone triggers only on Floor 4, while Ground Floor mess hall tasks trigger only on Floor 0.

---

## 4. Safety & Real-World Hostel Hazards

### Decisions
1. **Red Zones**:
   - Host-definable restricted hazard zones (e.g., Roof Parapet, High-Voltage Transformer Room, Broken Stairwells, Warden Quarters).
   - Entering a red zone triggers an immediate, loud two-tone siren (`playDangerAlarm`) and full-screen flashing hazard notification.
2. **Geofence Boundary & Grace Period**:
   - If a player leaves the hostel complex perimeter, a 15-second grace period countdown initiates. If they fail to return, a violation alert is broadcast to the host.
3. **Emergency SOS System**:
   - Persistent red `SOS` button accessible at all times in the top navigation bar.
   - Tapping SOS immediately broadcasts the player's last known location and floor to the host and all players with a high-priority distress alarm.

---

## 5. Web Audio API Synthesizer vs External MP3 Files

### Decision
All game sounds (sonar radar ping, accelerating heartbeat, hazard sirens, catch gong, emergency meeting klaxon, victory fanfare) are synthesized directly in the browser using the native **Web Audio API** (`src/client/hooks/useSoundEffects.ts`).

### Reason
- External `.mp3` or `.wav` files frequently fail in mobile browsers due to CORS policies, 404 paths, slow cellular caching, or mobile auto-play restrictions.
- Web Audio API oscillators and gain nodes require zero bandwidth, generate crisp 44.1kHz sound effects instantly, and work consistently across iOS Safari, Android Chrome, and desktop browsers.

---

## 6. Built-in Bot Simulation Engine

### Decision
Implemented a server-side `BotSimulationEngine` (`src/server/botSimulation.ts`).

### Reason
Testing hide-and-seek with 12 real people walking across 4 floors during development is impractical. The bot engine spawns AI players that:
- Patrol hostel waypoints inside the geofence perimeter.
- Hunters chase nearby crewmates and execute catches.
- Crewmates flee when hunters are within 20m, or complete tasks across floors.
- Tests can run autonomously in unit tests (`test/e2eSimulation.test.ts`) or in the live lobby with the "+4 Bots" host button.

---

## 7. Storage & Match History

### Decision
`GameStorage` (`src/server/storage.ts`) persists match records and leaderboards to local JSON files (`data/matches.json` and `data/leaderboard.json`).

### Reason
- Fast, zero external database dependency (no MongoDB or Postgres setup needed).
- Persistent across server reboots.
- Exposes clean REST endpoints (`/api/matches`, `/api/leaderboard`).

