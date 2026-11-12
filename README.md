# 🎯 Hostel Hunt

> **Real-Life Tactical Hide-and-Seek Mobile Game for Hostel & Campus Groups**

Hostel Hunt turns your hostel, dorm, or campus complex into a real-life multiplayer tactical stealth arena. Inspired by classic hide-and-seek and "Among Us", it handles live geofencing, server-authoritative role assignment, blurry radar contacts, proximity heartbeats, dynamic QR-code catching, multi-floor indoor navigation, and emergency SOS alerts.

---

## 🌟 Key Features

### 🕹️ Game Flow & Authority
- **No Complicated Signup**: Players join instantly with an anonymous codename, avatar badge, and room code. Persistent local session tokens handle seamless reconnects.
- **Authoritative Server Roles**: Roles (Hunters vs. Crewmates) are assigned server-side using an unbiased Fisher-Yates shuffle. Adversary roles and exact positions are strictly masked.
- **Hiding Phase (Default 60s)**: Crewmates scatter and hide; hunters are locked into a radar standby screen with synchronized countdown.
- **Hunt Phase (Default 10m)**: Hunters release to track and corner crewmates before the timer expires.
- **Win Conditions**:
  - **Hunters Win**: Catch all crewmates before the timer runs out.
  - **Crewmates Win**: At least one crewmate survives the countdown, OR crewmates complete all hostel objectives.
- **Spectator Mode**: Caught players transition into spectators to observe the live tactical map.

### ⚖️ Balanced Visibility & Anti-Cheat
- **No Wallhacking**: Crewmates see only themselves, the boundary perimeter, and hazard zones.
- **Blurry Uncertainty Circles**: Hunters see crewmates only as approximate 35-meter blurred radius circles refreshed every 20 seconds.
- **Radar Pulse Power-Up**: Hunters start with 3 instant radar pulses per match to temporarily reveal sharp positions.
- **Proximity Alerts**: Rhythmic audio heartbeat and screen vibration trigger when a hunter is within 15 meters on the same floor.
- **Face-to-Face QR Catching**: Cornered crewmates display a dynamic encrypted QR token on screen; the hunter scans it with their phone camera to confirm the catch.

### 🏢 Indoor & Multi-Floor Problem Solved
- **Synchronized Floor Quick-Bar**: Quick-toggle between Ground, Floor 1, Floor 2, Floor 3, and Terrace.
- **QR Checkpoints**: Scanning physical checkpoint posters at stairwells immediately locks verified floor level and calibrates GPS accuracy.
- **Exponential Moving Average (EMA) GPS Smoothing**: Eliminates wild GPS jumping caused by indoor concrete attenuation.
- **Floor-Aware Geofencing**: Catches, proximity warnings, and hazards require players to be on the same floor.

### 🛡️ Safety & Real-World Precautions
- **Host-Definable Red Zones**: Mark roofs, electrical transformer rooms, and damaged stairs as off-limits. Entering triggers loud two-tone siren alerts.
- **Boundary Grace Period**: Exiting the hostel perimeter triggers a 15-second grace countdown before violation flags are issued.
- **Instant SOS Button**: Visible in the top bar at all times; broadcasts the player's last known location and floor to the host and pauses gameplay.

### 🤖 AI Bot Simulation Mode
- Test the full game with up to 12 players without needing physical participants! The host can tap "+4 Test Bots" to spawn autonomous AI hunters and crewmates that patrol waypoints, chase targets, and complete tasks.

---

## 🚀 Quickstart

### Prerequisites
- **Node.js** (v18.0.0 or higher, tested on Node v24)
- **npm** (v9.0.0 or higher)

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone <repo-url> hostel-hunt
cd hostel-hunt
npm install
```

### 2. Run in Development Mode
Starts both the WebSocket backend server (`port 3001`) and the Vite frontend dev server (`port 5173`):
```bash
npm run dev
```
Open your browser at:
- **Client**: `http://localhost:5173`
- **Server API**: `http://localhost:3001/api/health`

### 3. Run Production Server
Builds the client and serves it directly from Express on `port 3001`:
```bash
npm run build
npm run start
```
Access the application at `http://localhost:3001`.

### 4. Run Unit & E2E Tests
Runs all 22 Vitest automated test suites covering role assignment, geofencing, Haversine distance, proximity logic, catch validation, and full end-to-end bot gameplay:
```bash
npm test
```

---

## 📱 Testing on Mobile Phones (Local WiFi / Hotspot)

To test with friends on real mobile devices:
1. Connect all phones and your development computer to the same hostel WiFi network (or your phone's mobile hotspot).
2. Find your computer's local IP address (e.g. `192.168.1.45` via `ipconfig` on Windows or `ifconfig` on macOS/Linux).
3. Start the server:
   ```bash
   npm run start
   ```
4. On your friends' phones, open Safari (iOS) or Chrome (Android) and navigate to:
   ```
   http://<YOUR_LOCAL_IP>:3001
   ```
5. Tap **"Add to Home Screen"** or **"Install App"** to install Hostel Hunt as a full-screen PWA with camera and geolocation access!

---

## ☁️ Deployment Instructions

### Free Cloud Hosting Tier (Render, Railway, Fly.io)

Hostel Hunt includes a combined Node.js server that serves both the Socket.io WebSocket endpoints and the built Vite static assets from `/dist`.

#### Deploy to Render (Free Tier):
1. Create a new **Web Service** on [render.com](https://render.com).
2. Link your GitHub repository.
3. Configure the service:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free
4. Add environment variables (optional):
   - `PORT`: `3001` (Render automatically assigns port via `process.env.PORT`)
5. Deploy! Render will provide an HTTPS URL (e.g. `https://hostel-hunt.onrender.com`).

---

## 📂 Project Structure

```
hunter/
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript compilation configuration
├── vite.config.ts             # Vite dev server with proxy
├── tailwind.config.js         # Cyberpunk/tactical theme colors & animations
├── public/
│   └── manifest.json          # PWA web app manifest
├── src/
│   ├── client/
│   │   ├── components/
│   │   │   ├── MapView.tsx             # Interactive Leaflet map & floor filters
│   │   │   ├── LobbyView.tsx           # Room lobby, roster, host controls
│   │   │   ├── HunterHUD.tsx           # Hunter radar sweep & catch trigger
│   │   │   ├── CrewmateHUD.tsx         # Proximity heartbeat & QR badge trigger
│   │   │   ├── SpectatorHUD.tsx        # Eliminated players observation view
│   │   │   ├── HostControlPanel.tsx    # God-view player table, boundary & red zones
│   │   │   ├── QRScannerModal.tsx      # HTML5 camera QR scanner + manual fallback
│   │   │   ├── QRCodeDisplayModal.tsx  # Dynamic catch token badge
│   │   │   ├── TaskModal.tsx           # Hostel objectives & electrical fuse puzzle
│   │   │   ├── ChatDrawer.tsx          # #all, #hunters radio, #announcements
│   │   │   ├── EmergencyMeetingModal.tsx # 60s discussion countdown
│   │   │   ├── HowToPlayModal.tsx      # Complete in-game field manual
│   │   │   ├── ResultsView.tsx         # Match winner & catches history timeline
│   │   │   └── JoinCreateScreen.tsx    # Anonymous codename & room code screen
│   │   ├── hooks/
│   │   │   ├── useGeolocation.ts       # High-accuracy GPS + EMA smoother + floor
│   │   │   ├── useSoundEffects.ts      # Web Audio API synthesizer
│   │   │   └── useVibration.ts         # Haptic feedback patterns
│   │   ├── context/
│   │   │   └── GameContext.tsx         # Central state & WebSocket engine
│   │   ├── App.tsx                     # Main view router
│   │   ├── main.tsx                    # React bootstrap entry
│   │   └── index.css                   # Custom leaflet dark theme styles
│   ├── server/
│   │   ├── index.ts                    # Production server bootstrap
│   │   ├── server.ts                   # Express & Socket.io server factory
│   │   ├── gameManager.ts              # Authoritative game rules engine
│   │   ├── socketHandlers.ts           # WebSocket event dispatch
│   │   ├── roleAssignment.ts           # Cryptographic Fisher-Yates role shuffle
│   │   ├── geofence.ts                 # Boundary & red zone violation evaluator
│   │   ├── catchValidator.ts           # Anti-cheat QR & proximity tag validator
│   │   ├── botSimulation.ts            # Autonomous AI bot players for demo/testing
│   │   └── storage.ts                  # Persistent match history & leaderboard
│   └── shared/
│       ├── types.ts                    # Full-stack TypeScript data contracts
│       ├── constants.ts                # Default campus coordinates & red zones
│       └── geoUtils.ts                 # Haversine distance & ray-casting algorithms
├── test/
│   ├── roleAssignment.test.ts          # Role shuffle & clamp tests
│   ├── geofence.test.ts                # Boundary, polygon & grace period tests
│   ├── proximity.test.ts               # 15m proximity & coordinate smoothing tests
│   ├── catchValidator.test.ts          # Anti-cheat QR & floor validation tests
│   ├── winCondition.test.ts            # Hunter/Crewmate/Task win logic tests
│   └── e2eSimulation.test.ts           # Complete multiplayer loop simulation test
├── DECISIONS.md                        # Architectural decisions & engineering record
└── README.md                           # Documentation & user guide
```

---

## 📖 How to Play (Quick Guide)

1. **Create / Join**: Host creates room (e.g. `HUNT5`). Friends enter their codename and room code.
2. **Setup**: Host adjusts perimeter radius and hunter count. Optional: click **"+4 Bots"** to test with bots.
3. **Hiding Phase (60s)**:
   - Crewmates run to hide in dorm rooms or stairwells.
   - Hunters are locked in standby mode.
4. **Hunt Phase (10m)**:
   - Hunters track blurry 20s radar contacts and use their 3 **Radar Pulses**.
   - Crewmates watch for the **pulsing heartbeat** when a hunter is within 15 meters.
   - Corner a crewmate and scan their screen's QR badge to eliminate them!
   - Crewmates can win by finishing hostel tasks or surviving until the timer expires.
5. **Safety First**:
   - Roofs, terraces, and electrical rooms are restricted Red Zones.
   - Tap **SOS** immediately if anyone requires assistance.

---

## 🔮 Known Limitations & Future Roadmap

1. **Bluetooth Low Energy (BLE) Beacon Integration**:
   - *Current*: Floor level is managed via quick-toggle selector and verified QR checkpoints.
   - *Future*: Estimote or iBeacon BLE hardware placed on each floor ceiling for automated floor switching without user input.
2. **Offline Mesh Networking**:
   - *Current*: Requires WiFi or cellular data connection to the central Node.js server.
   - *Future*: WebRTC mesh mode for peer-to-peer play in remote basements without cell signal.
3. **Audio Proximity Radar**:
   - *Current*: Web Audio API synthesizes heartbeat thumps when hunters are within 15 meters.
   - *Future*: Positional 3D spatial audio (`PannerNode`) indicating left/right hunter direction.

