import {
  GameRoom,
  Player,
  GameSettings,
  BoundarySettings,
  RedZone,
  TaskItem,
  ClientGameState,
  ClientPlayerSummary,
  BlurredLocation,
  LatLngWithFloor,
  ChatMessage,
  SOSAlert,
} from '../shared/types.js';
import {
  DEFAULT_BOUNDARY,
  DEFAULT_RED_ZONES,
  DEFAULT_SETTINGS,
  DEFAULT_TASKS,
} from '../shared/constants.js';
import { assignRoles } from './roleAssignment.js';
import { validateCatch } from './catchValidator.js';
import { evaluatePlayerLocation } from './geofence.js';
import {
  isHunterNearby,
  generateBlurredLocation,
} from '../shared/geoUtils.js';
import { BotSimulationEngine } from './botSimulation.js';
import { GameStorage } from './storage.js';

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private botEngines: Map<string, BotSimulationEngine> = new Map();
  private roomTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastRadarUpdate: Map<string, number> = new Map();
  private cachedBlurredTargets: Map<string, BlurredLocation[]> = new Map();
  private storage: GameStorage;
  private onStateChange: (roomCode: string) => void;
  private onBroadcastEvent: (roomCode: string, event: string, payload: any) => void;

  constructor(
    storage: GameStorage,
    callbacks: {
      onStateChange: (roomCode: string) => void;
      onBroadcastEvent: (roomCode: string, event: string, payload: any) => void;
    }
  ) {
    this.storage = storage;
    this.onStateChange = callbacks.onStateChange;
    this.onBroadcastEvent = callbacks.onBroadcastEvent;
  }

  public getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  public createRoom(
    hostName: string,
    gameName = 'Hostel Hunt Match',
    settings?: Partial<GameSettings>,
    boundary?: Partial<BoundarySettings>
  ): { room: GameRoom; hostPlayer: Player } {
    // Generate clean 5-character alphanumeric room code
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const hostId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const mergedSettings: GameSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
    };

    const mergedBoundary: BoundarySettings = {
      ...DEFAULT_BOUNDARY,
      ...boundary,
    };

    const hostPlayer: Player = {
      id: hostId,
      name: hostName.trim() || 'Host Hunter',
      avatar: '👑',
      role: null,
      isHost: true,
      isBot: false,
      status: 'alive',
      location: null,
      lastLocationUpdate: Date.now(),
      isInsideBoundary: true,
      boundaryViolationStart: null,
      currentRedZone: null,
      radarPulsesLeft: 3,
      completedTasks: [],
      qrCatchToken: `TOKEN_${hostId.slice(-4)}`,
      emergencyMeetingsLeft: 1,
    };

    const room: GameRoom = {
      roomCode,
      gameName,
      hostId,
      phase: 'lobby',
      startTime: null,
      phaseEndTime: null,
      paused: false,
      winner: null,
      winReason: null,
      settings: mergedSettings,
      boundary: mergedBoundary,
      redZones: [...DEFAULT_RED_ZONES],
      tasks: JSON.parse(JSON.stringify(DEFAULT_TASKS)),
      players: {
        [hostId]: hostPlayer,
      },
      chatMessages: [
        {
          id: `msg_${Date.now()}`,
          senderId: 'SYSTEM',
          senderName: 'HQ Dispatch',
          text: `Welcome to ${gameName}! Room code: ${roomCode}. Prepare your gear.`,
          timestamp: Date.now(),
          channel: 'announcements',
        },
      ],
      activeSos: null,
      stats: {
        totalCrewmates: 0,
        totalHunters: 0,
        caughtCrewmates: 0,
        tasksCompleted: 0,
        totalTasks: DEFAULT_TASKS.length,
        catches: [],
        sosAlerts: [],
      },
    };

    this.rooms.set(roomCode, room);

    // Initialize bot engine for this room
    const botEngine = new BotSimulationEngine(room, {
      onLocationUpdate: (player, location) => {
        this.updatePlayerLocation(roomCode, player.id, location);
      },
      onCatchAttempt: (hunterId, targetId) => {
        this.catchPlayer(roomCode, hunterId, 'proximity_tag', undefined, targetId);
      },
      onTaskCompleted: (playerId, taskId) => {
        this.completeTask(roomCode, playerId, taskId, 'SIMULATED_BOT_PASS');
      },
    });
    this.botEngines.set(roomCode, botEngine);

    return { room, hostPlayer };
  }

  public joinRoom(
    roomCode: string,
    playerName: string,
    avatar = '👤'
  ): { success: boolean; player?: Player; error?: string } {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: 'Room not found. Check the code and try again.' };
    }

    if (room.phase !== 'lobby') {
      return { success: false, error: 'Game has already started in this room.' };
    }

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const player: Player = {
      id: playerId,
      name: playerName.trim() || `Agent_${playerId.slice(-3)}`,
      avatar,
      role: null,
      isHost: false,
      isBot: false,
      status: 'alive',
      location: null,
      lastLocationUpdate: Date.now(),
      isInsideBoundary: true,
      boundaryViolationStart: null,
      currentRedZone: null,
      radarPulsesLeft: 3,
      completedTasks: [],
      qrCatchToken: `TOKEN_${playerId.slice(-4)}`,
      emergencyMeetingsLeft: 1,
    };

    room.players[playerId] = player;
    this.onStateChange(code);

    return { success: true, player };
  }

  public addBots(roomCode: string, hostId: string, count = 4): { success: boolean; addedCount: number; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, addedCount: 0, error: 'Room not found.' };
    if (room.hostId !== hostId) return { success: false, addedCount: 0, error: 'Only the host can add bots.' };
    if (room.phase !== 'lobby') return { success: false, addedCount: 0, error: 'Bots can only be added in the lobby.' };

    const engine = this.botEngines.get(roomCode);
    if (!engine) return { success: false, addedCount: 0, error: 'Bot engine not ready.' };

    const added = engine.addBots(count);
    this.onStateChange(roomCode);
    return { success: true, addedCount: added.length };
  }

  public kickPlayer(roomCode: string, hostId: string, targetId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.hostId !== hostId || targetId === hostId) return false;
    delete room.players[targetId];
    this.onStateChange(roomCode);
    return true;
  }

  public leaveOrCloseRoom(roomCode: string, playerId: string): { success: boolean; isHostClosed: boolean } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, isHostClosed: false };

    if (room.hostId === playerId) {
      // Host is closing and dissolving the room
      if (this.roomTimers.has(roomCode)) {
        clearInterval(this.roomTimers.get(roomCode)!);
        this.roomTimers.delete(roomCode);
      }
      const engine = this.botEngines.get(roomCode);
      if (engine) engine.stop();
      this.botEngines.delete(roomCode);
      this.rooms.delete(roomCode);

      this.onBroadcastEvent(roomCode, 'ROOM_CLOSED', {
        reason: 'The host has closed and dissolved the room.',
      });
      return { success: true, isHostClosed: true };
    } else {
      // Normal player leaving
      delete room.players[playerId];
      if (room.phase === 'hunting') {
        const aliveCrewmates = Object.values(room.players).filter(
          (p) => p.role === 'crewmate' && p.status === 'alive'
        );
        const aliveHunters = Object.values(room.players).filter(
          (p) => p.role === 'hunter' && p.status === 'alive'
        );
        if (aliveCrewmates.length === 0 && room.stats.totalCrewmates > 0) {
          this.endGame(roomCode, 'hunters', 'All crewmates left or were eliminated!');
        } else if (aliveHunters.length === 0 && room.stats.totalHunters > 0) {
          this.endGame(roomCode, 'crewmates', 'All hunters left the match!');
        }
      }
      this.onStateChange(roomCode);
      return { success: true, isHostClosed: false };
    }
  }

  public updateSettings(roomCode: string, hostId: string, updates: Partial<GameSettings>): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.hostId !== hostId || room.phase !== 'lobby') return false;
    room.settings = { ...room.settings, ...updates };
    this.onStateChange(roomCode);
    return true;
  }

  public updateBoundary(roomCode: string, hostId: string, boundary: BoundarySettings): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.hostId !== hostId) return false;
    room.boundary = boundary;
    this.onStateChange(roomCode);
    return true;
  }

  public addRedZone(roomCode: string, hostId: string, zone: RedZone): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.hostId !== hostId) return false;
    room.redZones.push(zone);
    this.onStateChange(roomCode);
    return true;
  }

  public removeRedZone(roomCode: string, hostId: string, zoneId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.hostId !== hostId) return false;
    room.redZones = room.redZones.filter((z) => z.id !== zoneId);
    this.onStateChange(roomCode);
    return true;
  }

  public startGame(roomCode: string, hostId: string): { success: boolean; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found.' };
    if (room.hostId !== hostId) return { success: false, error: 'Only the host can start the game.' };
    if (room.phase !== 'lobby') return { success: false, error: 'Game is already running.' };

    const assignment = assignRoles(room.players, room.settings.hunterCount);
    if (!assignment.success) {
      return { success: false, error: assignment.error };
    }

    const now = Date.now();
    room.startTime = now;
    room.phase = 'hiding';
    room.phaseEndTime = now + room.settings.hidingTimeSeconds * 1000;

    room.stats.totalHunters = assignment.hunters.length;
    room.stats.totalCrewmates = assignment.crewmates.length;
    room.stats.caughtCrewmates = 0;

    // Start bot simulation
    const botEngine = this.botEngines.get(roomCode);
    if (botEngine) {
      botEngine.start();
    }

    // Start game tick timer
    this.startRoomTimer(roomCode);
    this.onStateChange(roomCode);
    this.onBroadcastEvent(roomCode, 'GAME_STARTED', {
      phase: 'hiding',
      hidingSeconds: room.settings.hidingTimeSeconds,
    });

    return { success: true };
  }

  public skipHidingPhase(roomCode: string, hostId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.hostId !== hostId || room.phase !== 'hiding') return false;
    room.phase = 'hunting';
    room.phaseEndTime = Date.now() + room.settings.durationMinutes * 60 * 1000;
    this.onBroadcastEvent(roomCode, 'HUNT_STARTED', {
      durationMinutes: room.settings.durationMinutes,
    });
    this.onStateChange(roomCode);
    return true;
  }

  private startRoomTimer(roomCode: string): void {
    if (this.roomTimers.has(roomCode)) {
      clearInterval(this.roomTimers.get(roomCode)!);
    }

    const timer = setInterval(() => {
      this.tickRoom(roomCode);
    }, 1000);

    this.roomTimers.set(roomCode, timer);
  }

  private tickRoom(roomCode: string): void {
    const room = this.getRoom(roomCode);
    if (!room || room.paused || room.phase === 'ended') {
      return;
    }

    const now = Date.now();

    // Check phase transitions
    if (room.phase === 'hiding') {
      if (room.phaseEndTime && now >= room.phaseEndTime) {
        // Transition to hunting phase!
        room.phase = 'hunting';
        room.phaseEndTime = now + room.settings.durationMinutes * 60 * 1000;
        this.onBroadcastEvent(roomCode, 'HUNT_STARTED', {
          durationMinutes: room.settings.durationMinutes,
        });
        this.onStateChange(roomCode);
      }
    } else if (room.phase === 'hunting') {
      if (room.phaseEndTime && now >= room.phaseEndTime) {
        // Time expired! Crewmates win if at least one survived
        const aliveCrewmates = Object.values(room.players).filter(
          (p) => p.role === 'crewmate' && p.status === 'alive'
        );
        if (aliveCrewmates.length > 0) {
          this.endGame(roomCode, 'crewmates', 'Time expired! Crewmates evaded the hunters and survived.');
        } else {
          this.endGame(roomCode, 'hunters', 'All crewmates caught before time ran out.');
        }
        return;
      }

      // Check periodic radar refresh interval
      const lastPing = this.lastRadarUpdate.get(roomCode) || 0;
      if (now - lastPing >= room.settings.updateIntervalSeconds * 1000) {
        this.updateRadarPings(roomCode);
        this.lastRadarUpdate.set(roomCode, now);
      }
    } else if (room.phase === 'meeting') {
      if (room.phaseEndTime && now >= room.phaseEndTime) {
        // Resume hunting phase
        room.phase = 'hunting';
        // Add remaining time back
        room.phaseEndTime = now + 180 * 1000; // resume 3 min or configured remainder
        this.onBroadcastEvent(roomCode, 'MEETING_ENDED', {});
        this.onStateChange(roomCode);
      }
    }
  }

  private updateRadarPings(roomCode: string): void {
    const room = this.getRoom(roomCode);
    if (!room) return;

    const aliveCrewmates = Object.values(room.players).filter(
      (p) => p.role === 'crewmate' && p.status === 'alive' && p.location
    );

    const blurred: BlurredLocation[] = aliveCrewmates.map((c) => {
      const loc = generateBlurredLocation(c.location!, room.settings.blurRadiusMeters);
      return {
        id: c.id,
        centroid: loc.centroid,
        radiusMeters: loc.radiusMeters,
        floor: c.location!.floor,
        lastPingTime: Date.now(),
      };
    });

    this.cachedBlurredTargets.set(roomCode, blurred);
    this.onBroadcastEvent(roomCode, 'RADAR_PING', { targets: blurred });
  }

  public updatePlayerLocation(
    roomCode: string,
    playerId: string,
    location: LatLngWithFloor
  ): void {
    const room = this.getRoom(roomCode);
    if (!room) return;

    const player = room.players[playerId];
    if (!player) return;

    player.location = location;
    player.lastLocationUpdate = Date.now();

    const evalResult = evaluatePlayerLocation(player, location, room);

    if (evalResult.enteredRedZone) {
      this.onBroadcastEvent(roomCode, 'RED_ZONE_WARNING', {
        playerId,
        playerName: player.name,
        zone: evalResult.enteredRedZone,
      });
    }

    if (evalResult.boundaryGraceExpired) {
      this.onBroadcastEvent(roomCode, 'BOUNDARY_VIOLATION', {
        playerId,
        playerName: player.name,
        location,
      });
    }
  }

  public catchPlayer(
    roomCode: string,
    hunterId: string,
    method: 'qr' | 'proximity_tag',
    qrToken?: string,
    targetPlayerId?: string
  ): { success: boolean; caughtPlayerName?: string; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const validation = validateCatch(room, {
      hunterId,
      method,
      qrToken,
      targetPlayerId,
    });

    if (!validation.valid || !validation.crewmate || !validation.hunter) {
      return { success: false, error: validation.reason || 'Catch validation failed.' };
    }

    const crewmate = validation.crewmate;
    const hunter = validation.hunter;

    crewmate.status = 'caught';
    crewmate.caughtBy = { id: hunter.id, name: hunter.name };
    crewmate.caughtAt = Date.now();

    room.stats.caughtCrewmates++;
    room.stats.catches.push({
      hunterId: hunter.id,
      hunterName: hunter.name,
      crewmateId: crewmate.id,
      crewmateName: crewmate.name,
      timestamp: Date.now(),
      floor: crewmate.location ? crewmate.location.floor : 0,
    });

    this.onBroadcastEvent(roomCode, 'PLAYER_CAUGHT', {
      hunterId: hunter.id,
      hunterName: hunter.name,
      crewmateId: crewmate.id,
      crewmateName: crewmate.name,
      floor: crewmate.location ? crewmate.location.floor : 0,
      timestamp: Date.now(),
    });

    // Check Win Condition: All crewmates caught?
    const aliveCrewmates = Object.values(room.players).filter(
      (p) => p.role === 'crewmate' && p.status === 'alive'
    );

    if (aliveCrewmates.length === 0) {
      this.endGame(roomCode, 'hunters', 'Hunters eliminated all crewmates!');
    } else {
      this.onStateChange(roomCode);
    }

    return { success: true, caughtPlayerName: crewmate.name };
  }

  public activateRadarPulse(
    roomCode: string,
    hunterId: string
  ): { success: boolean; pulsesRemaining: number; targets?: BlurredLocation[]; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, pulsesRemaining: 0, error: 'Room not found.' };

    const hunter = room.players[hunterId];
    if (!hunter || hunter.role !== 'hunter' || hunter.status !== 'alive') {
      return { success: false, pulsesRemaining: 0, error: 'Only alive hunters can activate radar pulse.' };
    }

    if (hunter.radarPulsesLeft <= 0) {
      return { success: false, pulsesRemaining: 0, error: 'No radar pulses remaining.' };
    }

    hunter.radarPulsesLeft--;

    // Reveal exact/high-precision positions of alive crewmates for 6 seconds
    const aliveCrewmates = Object.values(room.players).filter(
      (p) => p.role === 'crewmate' && p.status === 'alive' && p.location
    );

    const pulseTargets: BlurredLocation[] = aliveCrewmates.map((c) => ({
      id: c.id,
      centroid: { lat: c.location!.lat, lng: c.location!.lng },
      radiusMeters: 10, // tighter focus
      floor: c.location!.floor,
      lastPingTime: Date.now(),
      isExact: true,
    }));

    room.radarPulseActiveUntil = Date.now() + 6000;

    this.onBroadcastEvent(roomCode, 'RADAR_PULSE_ACTIVATED', {
      hunterName: hunter.name,
      pulseTargets,
      durationMs: 6000,
    });

    return {
      success: true,
      pulsesRemaining: hunter.radarPulsesLeft,
      targets: pulseTargets,
    };
  }

  public completeTask(
    roomCode: string,
    playerId: string,
    taskId: string,
    code: string
  ): { success: boolean; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const player = room.players[playerId];
    if (!player || player.role !== 'crewmate' || player.status !== 'alive') {
      return { success: false, error: 'Only alive crewmates can perform tasks.' };
    }

    const task = room.tasks.find((t) => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found.' };

    if (code !== 'SIMULATED_BOT_PASS' && task.code !== code) {
      return { success: false, error: 'Invalid task verification code.' };
    }

    if (!player.completedTasks.includes(taskId)) {
      player.completedTasks.push(taskId);
      room.stats.tasksCompleted++;
    }

    this.onBroadcastEvent(roomCode, 'TASK_COMPLETED', {
      playerId,
      playerName: player.name,
      taskTitle: task.title,
    });

    // Check Task Win condition
    if (room.settings.allowTaskWin) {
      const allDone = room.tasks.every((t) =>
        Object.values(room.players).some((p) => p.completedTasks.includes(t.id))
      );
      if (allDone) {
        this.endGame(roomCode, 'crewmates', 'All tasks completed across the hostel!');
      }
    }

    this.onStateChange(roomCode);
    return { success: true };
  }

  public callEmergencyMeeting(
    roomCode: string,
    playerId: string
  ): { success: boolean; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const player = room.players[playerId];
    if (!player || player.status !== 'alive') {
      return { success: false, error: 'Only alive players can call a meeting.' };
    }

    if (player.emergencyMeetingsLeft <= 0) {
      return { success: false, error: 'No emergency meetings left.' };
    }

    if (room.phase !== 'hunting') {
      return { success: false, error: 'Meetings can only be called during Hunt Phase.' };
    }

    player.emergencyMeetingsLeft--;
    room.phase = 'meeting';
    room.phaseEndTime = Date.now() + 60 * 1000; // 60s discussion

    this.onBroadcastEvent(roomCode, 'EMERGENCY_MEETING_CALLED', {
      callerName: player.name,
      durationSeconds: 60,
    });

    this.onStateChange(roomCode);
    return { success: true };
  }

  public triggerSOS(
    roomCode: string,
    playerId: string
  ): { success: boolean; alert?: SOSAlert; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const player = room.players[playerId];
    if (!player) return { success: false, error: 'Player not found.' };

    const location: LatLngWithFloor = player.location || {
      lat: room.boundary.center.lat,
      lng: room.boundary.center.lng,
      floor: 0,
      timestamp: Date.now(),
    };

    const sosAlert: SOSAlert = {
      id: `sos_${Date.now()}`,
      playerId,
      playerName: player.name,
      location,
      timestamp: Date.now(),
      status: 'active',
    };

    room.activeSos = sosAlert;
    room.stats.sosAlerts.push(sosAlert);

    this.onBroadcastEvent(roomCode, 'SOS_TRIGGERED', sosAlert);
    this.onStateChange(roomCode);

    return { success: true, alert: sosAlert };
  }

  public resolveSOS(roomCode: string, hostId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.hostId !== hostId) return false;
    room.activeSos = null;
    this.onBroadcastEvent(roomCode, 'SOS_RESOLVED', {});
    this.onStateChange(roomCode);
    return true;
  }

  public sendChatMessage(
    roomCode: string,
    senderId: string,
    text: string,
    channel: 'all' | 'hunters' | 'announcements'
  ): { success: boolean; message?: ChatMessage; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found.' };

    const player = room.players[senderId];
    if (!player) return { success: false, error: 'Sender not found.' };

    // Hunter channel security: only hunters can send
    if (channel === 'hunters' && player.role !== 'hunter') {
      return { success: false, error: 'Channel restricted to hunters.' };
    }

    // Announcements channel: only host can send
    if (channel === 'announcements' && !player.isHost) {
      return { success: false, error: 'Channel restricted to host.' };
    }

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId,
      senderName: player.name,
      senderRole: player.role,
      text: text.trim(),
      timestamp: Date.now(),
      channel,
    };

    room.chatMessages.push(message);
    if (room.chatMessages.length > 100) {
      room.chatMessages = room.chatMessages.slice(-100);
    }

    this.onBroadcastEvent(roomCode, 'CHAT_MESSAGE', message);
    return { success: true, message };
  }

  public endGame(
    roomCode: string,
    winner: 'hunters' | 'crewmates',
    winReason: string
  ): void {
    const room = this.getRoom(roomCode);
    if (!room) return;

    room.phase = 'ended';
    room.winner = winner;
    room.winReason = winReason;

    // Stop bots & timer
    const botEngine = this.botEngines.get(roomCode);
    if (botEngine) {
      botEngine.stop();
    }

    if (this.roomTimers.has(roomCode)) {
      clearInterval(this.roomTimers.get(roomCode)!);
      this.roomTimers.delete(roomCode);
    }

    // Save match record in persistent storage
    const huntersList = Object.values(room.players)
      .filter((p) => p.role === 'hunter')
      .map((p) => p.name);
    const crewmatesList = Object.values(room.players)
      .filter((p) => p.role === 'crewmate')
      .map((p) => p.name);

    this.storage.recordMatch({
      id: `match_${Date.now()}`,
      roomCode: room.roomCode,
      gameName: room.gameName,
      playedAt: room.startTime || Date.now(),
      durationSeconds: room.startTime ? Math.round((Date.now() - room.startTime) / 1000) : 0,
      winner,
      winReason,
      hunters: huntersList,
      crewmates: crewmatesList,
      catchesCount: room.stats.catches.length,
      catches: room.stats.catches.map((c) => ({
        hunterName: c.hunterName,
        crewmateName: c.crewmateName,
        timestamp: c.timestamp,
      })),
    });

    this.onBroadcastEvent(roomCode, 'GAME_ENDED', { winner, winReason });
    this.onStateChange(roomCode);
  }

  /**
   * Generates a secure, filtered client game state based on player's identity and role.
   * Zero leakage of secret locations or adversary roles.
   */
  public generateClientState(roomCode: string, forPlayerId: string): ClientGameState | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const player = room.players[forPlayerId];
    if (!player) return null;

    const isHost = player.isHost;
    const myRole = player.role;
    const isSpectator = player.status === 'caught' || player.status === 'spectator';
    const isEnded = room.phase === 'ended';

    // Calculate proximity alerts
    let proximityActive = false;
    let huntersNearbyCount = 0;
    let closestDistance: number | undefined;

    if (myRole === 'crewmate' && player.location && player.status === 'alive') {
      const aliveHunters = Object.values(room.players)
        .filter((p) => p.role === 'hunter' && p.status === 'alive' && p.location)
        .map((p) => p.location!);

      const prox = isHunterNearby(
        player.location,
        aliveHunters,
        room.settings.proximityWarningMeters
      );
      proximityActive = prox.nearby;
      huntersNearbyCount = prox.count;
      closestDistance = prox.closestDistance;
    }

    // Filter players list
    const playerSummaries: ClientPlayerSummary[] = Object.values(room.players).map((p) => {
      const summary: ClientPlayerSummary = {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        isBot: p.isBot,
        status: p.status,
      };

      // Role visibility:
      // - Host sees all roles
      // - At game end or for spectators, roles are visible
      // - Same-team hunters see hunter roles
      // - Otherwise, adversary role is hidden
      if (isHost || isEnded || isSpectator || p.id === forPlayerId || (myRole === 'hunter' && p.role === 'hunter')) {
        summary.role = p.role;
      }

      // Location visibility:
      // - Host sees all exact locations
      // - Spectators see all locations
      // - Hunter sees fellow hunters
      // - Player sees self
      if (isHost || isSpectator || isEnded || p.id === forPlayerId || (myRole === 'hunter' && p.role === 'hunter')) {
        summary.location = p.location;
        summary.floor = p.location ? p.location.floor : undefined;
      }

      return summary;
    });

    // Hunter blurred radar targets
    let blurredTargets: BlurredLocation[] | undefined;
    const isRadarActive = !!(room.radarPulseActiveUntil && Date.now() < room.radarPulseActiveUntil);

    if (myRole === 'hunter') {
      if (isRadarActive) {
        // High-precision pings during pulse
        const aliveCrewmates = Object.values(room.players).filter(
          (p) => p.role === 'crewmate' && p.status === 'alive' && p.location
        );
        blurredTargets = aliveCrewmates.map((c) => ({
          id: c.id,
          centroid: { lat: c.location!.lat, lng: c.location!.lng },
          radiusMeters: 10,
          floor: c.location!.floor,
          lastPingTime: Date.now(),
          isExact: true,
        }));
      } else {
        blurredTargets = this.cachedBlurredTargets.get(roomCode) || [];
      }
    }

    // Chat messages filtering: crewmates cannot see hunter encrypted chat
    const filteredChat = room.chatMessages.filter((msg) => {
      if (msg.channel === 'hunters') {
        return myRole === 'hunter' || isHost;
      }
      return true;
    });

    const now = Date.now();
    const remainingSeconds = room.phaseEndTime
      ? Math.max(0, Math.ceil((room.phaseEndTime - now) / 1000))
      : 0;

    return {
      roomCode: room.roomCode,
      gameName: room.gameName,
      hostId: room.hostId,
      myPlayerId: forPlayerId,
      myRole,
      phase: room.phase,
      startTime: room.startTime,
      phaseEndTime: room.phaseEndTime,
      remainingSeconds,
      paused: room.paused,
      winner: room.winner,
      winReason: room.winReason,
      settings: room.settings,
      boundary: room.boundary,
      redZones: room.redZones,
      tasks: room.tasks,
      players: playerSummaries,
      self: player,
      blurredTargets,
      proximityAlert: {
        active: proximityActive,
        hunterCountNearby: huntersNearbyCount,
        distanceEstimated: closestDistance,
      },
      activeSos: room.activeSos,
      radarPulseActive: isRadarActive,
      stats: room.stats,
      chatMessages: filteredChat,
    };
  }
}

