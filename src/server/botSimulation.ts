import { Player, GameRoom, LatLngWithFloor } from '../shared/types.js';
import { calculateDistanceMeters, isInsideBoundary } from '../shared/geoUtils.js';

interface BotAIState {
  playerId: string;
  targetWaypoint: LatLngWithFloor;
  speedMps: number; // meters per second (~1.2 m/s walk, 2.5 m/s run)
  taskTargetIndex: number;
  fleeingFromHunterId?: string | null;
}

const BOT_NAMES = [
  'Ghost_Rider', 'Shadow_Ninja', 'Phantom_Sam', 'Neon_Spectre', 
  'Viper_Alex', 'Raven_Priya', 'Cipher_Rohan', 'Echo_Maya', 
  'Blaze_Kavya', 'Frost_David', 'Apex_Arjun', 'Pulse_Zack'
];

const BOT_AVATARS = ['🤖', '🦊', '🐺', '🐱', '🦁', '🐯', '🦅', '🐻', '🐼', '🐨'];

export class BotSimulationEngine {
  private room: GameRoom;
  private botStates: Map<string, BotAIState> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private onLocationUpdate: (player: Player, location: LatLngWithFloor) => void;
  private onCatchAttempt: (hunterId: string, targetId: string) => void;
  private onTaskCompleted: (playerId: string, taskId: string) => void;

  constructor(
    room: GameRoom,
    callbacks: {
      onLocationUpdate: (player: Player, location: LatLngWithFloor) => void;
      onCatchAttempt: (hunterId: string, targetId: string) => void;
      onTaskCompleted: (playerId: string, taskId: string) => void;
    }
  ) {
    this.room = room;
    this.onLocationUpdate = callbacks.onLocationUpdate;
    this.onCatchAttempt = callbacks.onCatchAttempt;
    this.onTaskCompleted = callbacks.onTaskCompleted;
  }

  /**
   * Adds N simulated bots into the lobby
   */
  public addBots(count = 6): Player[] {
    const added: Player[] = [];
    const existingCount = Object.keys(this.room.players).length;

    for (let i = 0; i < count; i++) {
      const botId = `bot_${Date.now()}_${i}`;
      const name = BOT_NAMES[(existingCount + i) % BOT_NAMES.length];
      const avatar = BOT_AVATARS[(existingCount + i) % BOT_AVATARS.length];
      
      // Random starting location within 50m of boundary center
      const angle = Math.random() * 2 * Math.PI;
      const radius = Math.random() * (this.room.boundary.radius * 0.6);
      const deltaLat = (radius * Math.cos(angle)) / 111320;
      const deltaLng = (radius * Math.sin(angle)) / (111320 * Math.cos((this.room.boundary.center.lat * Math.PI) / 180));

      const initialLocation: LatLngWithFloor = {
        lat: Number((this.room.boundary.center.lat + deltaLat).toFixed(6)),
        lng: Number((this.room.boundary.center.lng + deltaLng).toFixed(6)),
        floor: Math.floor(Math.random() * 3), // 0, 1, or 2
        accuracy: 8,
        timestamp: Date.now(),
      };

      const botPlayer: Player = {
        id: botId,
        name: `[BOT] ${name}`,
        avatar,
        role: null,
        isHost: false,
        isBot: true,
        status: 'alive',
        location: initialLocation,
        lastLocationUpdate: Date.now(),
        isInsideBoundary: true,
        boundaryViolationStart: null,
        currentRedZone: null,
        radarPulsesLeft: 3,
        completedTasks: [],
        qrCatchToken: `BOT_CATCH_${botId.slice(-4)}`,
        emergencyMeetingsLeft: 1,
      };

      this.room.players[botId] = botPlayer;
      this.botStates.set(botId, {
        playerId: botId,
        targetWaypoint: this.generateRandomWaypoint(initialLocation.floor),
        speedMps: 1.4, // walk speed
        taskTargetIndex: i % Math.max(1, this.room.tasks.length),
      });

      added.push(botPlayer);
    }

    return added;
  }

  /**
   * Starts the movement and decision loop (ticks every 1.5s)
   */
  public start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1500);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    if (this.room.phase !== 'hiding' && this.room.phase !== 'hunting') {
      return;
    }

    const alivePlayers = Object.values(this.room.players).filter((p) => p.status === 'alive');
    const hunters = alivePlayers.filter((p) => p.role === 'hunter');
    const crewmates = alivePlayers.filter((p) => p.role === 'crewmate');

    for (const [botId, state] of this.botStates.entries()) {
      const player = this.room.players[botId];
      if (!player || player.status !== 'alive' || !player.location) continue;

      // Hunter logic during Hunt phase
      if (player.role === 'hunter') {
        if (this.room.phase === 'hunting') {
          this.executeHunterAI(player, state, crewmates);
        }
      } else if (player.role === 'crewmate') {
        this.executeCrewmateAI(player, state, hunters);
      }
    }
  }

  private executeHunterAI(
    hunter: Player,
    state: BotAIState,
    aliveCrewmates: Player[]
  ): void {
    if (!hunter.location) return;

    // 1. Check if any crewmate is in catch range (< 6m on same floor)
    for (const crewmate of aliveCrewmates) {
      if (!crewmate.location) continue;
      if (crewmate.location.floor === hunter.location.floor) {
        const dist = calculateDistanceMeters(hunter.location, crewmate.location);
        if (dist <= 6) {
          // Catch target!
          this.onCatchAttempt(hunter.id, crewmate.id);
          return;
        }
      }
    }

    // 2. Chase nearest known or visible crewmate
    let nearestCrewmate: Player | null = null;
    let minDist = Infinity;
    for (const crewmate of aliveCrewmates) {
      if (!crewmate.location) continue;
      const dist = calculateDistanceMeters(hunter.location, crewmate.location);
      if (dist < minDist) {
        minDist = dist;
        nearestCrewmate = crewmate;
      }
    }

    if (nearestCrewmate && nearestCrewmate.location && minDist < 45) {
      // Move toward crewmate
      state.speedMps = 2.2; // sprint
      state.targetWaypoint = {
        lat: nearestCrewmate.location.lat,
        lng: nearestCrewmate.location.lng,
        floor: nearestCrewmate.location.floor,
        timestamp: Date.now(),
      };
    } else {
      // Patrol waypoints
      state.speedMps = 1.3;
      if (calculateDistanceMeters(hunter.location, state.targetWaypoint) < 4) {
        state.targetWaypoint = this.generateRandomWaypoint(hunter.location.floor);
      }
    }

    this.stepTowardsWaypoint(hunter, state);
  }

  private executeCrewmateAI(
    crewmate: Player,
    state: BotAIState,
    aliveHunters: Player[]
  ): void {
    if (!crewmate.location) return;

    // Check if any hunter is within 20m on same floor -> FLEE!
    let threateningHunter: Player | null = null;
    for (const hunter of aliveHunters) {
      if (hunter.location && hunter.location.floor === crewmate.location.floor) {
        const dist = calculateDistanceMeters(crewmate.location, hunter.location);
        if (dist <= 20) {
          threateningHunter = hunter;
          break;
        }
      }
    }

    if (threateningHunter && threateningHunter.location) {
      // Flee in opposite direction
      state.speedMps = 2.5; // run
      const angleAway = Math.atan2(
        crewmate.location.lat - threateningHunter.location.lat,
        crewmate.location.lng - threateningHunter.location.lng
      );
      const fleeDistMeters = 15;
      const deltaLat = (fleeDistMeters * Math.sin(angleAway)) / 111320;
      const deltaLng =
        (fleeDistMeters * Math.cos(angleAway)) /
        (111320 * Math.cos((crewmate.location.lat * Math.PI) / 180));

      const potentialTarget: LatLngWithFloor = {
        lat: Number((crewmate.location.lat + deltaLat).toFixed(6)),
        lng: Number((crewmate.location.lng + deltaLng).toFixed(6)),
        floor: crewmate.location.floor,
        timestamp: Date.now(),
      };

      if (isInsideBoundary(potentialTarget, this.room.boundary)) {
        state.targetWaypoint = potentialTarget;
      }
    } else {
      // Relaxed stealth movement: patrol rooms & stay hidden
      state.speedMps = 1.0;
      if (calculateDistanceMeters(crewmate.location, state.targetWaypoint) < 3) {
        state.targetWaypoint = this.generateRandomWaypoint(crewmate.location.floor);
      }
    }

    this.stepTowardsWaypoint(crewmate, state);
  }

  private stepTowardsWaypoint(player: Player, state: BotAIState): void {
    if (!player.location) return;

    const target = state.targetWaypoint;
    const current = player.location;
    const distTotal = calculateDistanceMeters(current, target);

    // Floor transition chance if waypoints differ
    if (current.floor !== target.floor && Math.random() < 0.2) {
      current.floor = target.floor;
    }

    if (distTotal <= 1) return;

    // Step distance = speed * dt (1.5 seconds)
    const stepDist = Math.min(distTotal, state.speedMps * 1.5);
    const ratio = stepDist / distTotal;

    const newLat = current.lat + (target.lat - current.lat) * ratio;
    const newLng = current.lng + (target.lng - current.lng) * ratio;

    const updatedLocation: LatLngWithFloor = {
      lat: Number(newLat.toFixed(6)),
      lng: Number(newLng.toFixed(6)),
      floor: current.floor,
      accuracy: 6 + Math.floor(Math.random() * 5),
      timestamp: Date.now(),
    };

    player.location = updatedLocation;
    player.lastLocationUpdate = Date.now();
    this.onLocationUpdate(player, updatedLocation);
  }

  private generateRandomWaypoint(preferredFloor: number): LatLngWithFloor {
    const center = this.room.boundary.center;
    const maxRadius = this.room.boundary.radius * 0.8;
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.random() * maxRadius;

    const deltaLat = (dist * Math.cos(angle)) / 111320;
    const deltaLng = (dist * Math.sin(angle)) / (111320 * Math.cos((center.lat * Math.PI) / 180));

    // Occasionally change floor (e.g. 25% chance to wander stairs)
    const floorChange = Math.random() < 0.25 ? Math.floor(Math.random() * 4) : preferredFloor;

    return {
      lat: Number((center.lat + deltaLat).toFixed(6)),
      lng: Number((center.lng + deltaLng).toFixed(6)),
      floor: floorChange,
      timestamp: Date.now(),
    };
  }
}

