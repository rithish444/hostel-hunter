export type Role = 'hunter' | 'crewmate';

export type PlayerStatus = 'alive' | 'caught' | 'spectator' | 'disconnected';

export type GamePhase = 'lobby' | 'hiding' | 'hunting' | 'meeting' | 'ended';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LatLngWithFloor extends LatLng {
  floor: number; // 0 = Ground, 1 = 1st floor, etc.
  accuracy?: number; // in meters from Geolocation API
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface RedZone {
  id: string;
  name: string;
  center: LatLng;
  radius: number; // in meters
  floor?: number | 'all'; // can be restricted on all floors or specific floor (e.g. roof)
  description: string;
  severity: 'danger' | 'warning';
}

export interface BoundarySettings {
  center: LatLng;
  radius: number; // circular geofence radius in meters
  name?: string;
  points?: LatLng[]; // optional polygon coordinates
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  floor: number;
  location: LatLng;
  code: string; // QR code secret payload or checkpoint key
  completed: boolean;
  type: 'qr' | 'minigame';
  minigameType?: 'wire' | 'fuses' | 'keypad';
}

export interface GameSettings {
  durationMinutes: number; // total hunt phase duration
  hidingTimeSeconds: number; // hiding countdown before hunters release
  hunterCount: number; // number of hunters to assign
  updateIntervalSeconds: number; // radar refresh interval (default 20s)
  proximityWarningMeters: number; // distance triggering proximity alert (default 15m)
  blurRadiusMeters: number; // radius of uncertainty circle for hunters (default 35m)
  radarPulsesPerHunter: number; // number of instant radar pulses each hunter has (default 3)
  gracePeriodSeconds: number; // seconds allowed outside boundary before penalty (default 15s)
  allowTaskWin: boolean; // if true, crewmates win when all tasks complete
  emergencyMeetingsAllowed: number; // number of meetings crewmates can call
  defaultFloor: number;
  floors: { level: number; name: string }[];
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  role: Role | null;
  isHost: boolean;
  isBot: boolean;
  status: PlayerStatus;
  location: LatLngWithFloor | null;
  lastLocationUpdate: number;
  isInsideBoundary: boolean;
  boundaryViolationStart: number | null;
  currentRedZone: string | null;
  radarPulsesLeft: number;
  caughtBy?: { id: string; name: string } | null;
  caughtAt?: number | null;
  completedTasks: string[];
  qrCatchToken: string; // One-time token shown to hunters for scanning
  emergencyMeetingsLeft: number;
}

export interface BlurredLocation {
  id: string;
  centroid: LatLng;
  radiusMeters: number;
  floor: number;
  lastPingTime: number;
  isExact?: boolean; // true during radar pulse or spectator view
}

export interface GameStats {
  totalCrewmates: number;
  totalHunters: number;
  caughtCrewmates: number;
  tasksCompleted: number;
  totalTasks: number;
  catches: {
    hunterId: string;
    hunterName: string;
    crewmateId: string;
    crewmateName: string;
    timestamp: number;
    floor: number;
  }[];
  sosAlerts: {
    playerId: string;
    playerName: string;
    timestamp: number;
    location: LatLngWithFloor;
  }[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: Role | null;
  text: string;
  timestamp: number;
  channel: 'all' | 'hunters' | 'announcements';
}

export interface SOSAlert {
  id: string;
  playerId: string;
  playerName: string;
  location: LatLngWithFloor;
  timestamp: number;
  status: 'active' | 'resolved';
}

export interface GameRoom {
  roomCode: string;
  gameName: string;
  hostId: string;
  phase: GamePhase;
  startTime: number | null;
  phaseEndTime: number | null;
  paused: boolean;
  winner: 'hunters' | 'crewmates' | null;
  winReason: string | null;
  settings: GameSettings;
  boundary: BoundarySettings;
  redZones: RedZone[];
  tasks: TaskItem[];
  players: Record<string, Player>;
  chatMessages: ChatMessage[];
  activeSos: SOSAlert | null;
  stats: GameStats;
  radarPulseActiveUntil?: number; // global or hunter pulse timestamp
}

// Client-sanitized state: security filtered by authoritative server
export interface ClientGameState {
  roomCode: string;
  gameName: string;
  hostId: string;
  myPlayerId: string;
  myRole: Role | null;
  phase: GamePhase;
  startTime: number | null;
  phaseEndTime: number | null;
  remainingSeconds: number;
  paused: boolean;
  winner: 'hunters' | 'crewmates' | null;
  winReason: string | null;
  settings: GameSettings;
  boundary: BoundarySettings;
  redZones: RedZone[];
  tasks: TaskItem[];
  players: ClientPlayerSummary[];
  self: Player;
  blurredTargets?: BlurredLocation[]; // Provided to hunters
  exactAllies?: ClientPlayerSummary[]; // For hunters (other hunters)
  proximityAlert: {
    active: boolean;
    hunterCountNearby: number;
    distanceEstimated?: number;
  };
  activeSos: SOSAlert | null;
  radarPulseActive: boolean;
  stats: GameStats;
  chatMessages: ChatMessage[];
}

export interface ClientPlayerSummary {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
  status: PlayerStatus;
  role?: Role | null; // Only exposed if spectator or game ended, or if host
  location?: LatLngWithFloor | null; // Only exposed to host or teammates if applicable
  floor?: number;
}

