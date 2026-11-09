import { describe, it, expect } from 'vitest';
import { validateCatch } from '../src/server/catchValidator.js';
import { GameRoom, Player } from '../src/shared/types.js';

function createMockRoom(): GameRoom {
  const hunter: Player = {
    id: 'h1',
    name: 'Hunter One',
    avatar: '🎯',
    role: 'hunter',
    isHost: true,
    isBot: false,
    status: 'alive',
    location: { lat: 12.9716, lng: 77.5946, floor: 0, timestamp: Date.now() },
    lastLocationUpdate: Date.now(),
    isInsideBoundary: true,
    boundaryViolationStart: null,
    currentRedZone: null,
    radarPulsesLeft: 3,
    completedTasks: [],
    qrCatchToken: 'HUNTER_TOKEN',
    emergencyMeetingsLeft: 1,
  };

  const crewmate: Player = {
    id: 'c1',
    name: 'Crewmate One',
    avatar: '🏃',
    role: 'crewmate',
    isHost: false,
    isBot: false,
    status: 'alive',
    location: { lat: 12.97163, lng: 77.5946, floor: 0, timestamp: Date.now() }, // ~3.5 meters away
    lastLocationUpdate: Date.now(),
    isInsideBoundary: true,
    boundaryViolationStart: null,
    currentRedZone: null,
    radarPulsesLeft: 0,
    completedTasks: [],
    qrCatchToken: 'SECRET_QR_12345',
    emergencyMeetingsLeft: 1,
  };

  return {
    roomCode: 'HUNTX',
    gameName: 'Catch Test',
    hostId: 'h1',
    phase: 'hunting',
    startTime: Date.now(),
    phaseEndTime: Date.now() + 600000,
    paused: false,
    winner: null,
    winReason: null,
    settings: {
      durationMinutes: 10,
      hidingTimeSeconds: 60,
      hunterCount: 1,
      updateIntervalSeconds: 20,
      proximityWarningMeters: 15,
      blurRadiusMeters: 30,
      radarPulsesPerHunter: 3,
      gracePeriodSeconds: 15,
      allowTaskWin: true,
      emergencyMeetingsAllowed: 1,
      defaultFloor: 0,
      floors: [],
    },
    boundary: { center: { lat: 12.9716, lng: 77.5946 }, radius: 100 },
    redZones: [],
    tasks: [],
    players: { h1: hunter, c1: crewmate },
    chatMessages: [],
    activeSos: null,
    stats: { totalCrewmates: 1, totalHunters: 1, caughtCrewmates: 0, tasksCompleted: 0, totalTasks: 0, catches: [], sosAlerts: [] },
  };
}

describe('Catch Mechanism & Anti-Cheat Validation', () => {
  it('validates catch when valid dynamic QR code is scanned', () => {
    const room = createMockRoom();
    const result = validateCatch(room, {
      hunterId: 'h1',
      method: 'qr',
      qrToken: 'SECRET_QR_12345',
    });

    expect(result.valid).toBe(true);
    expect(result.crewmate?.id).toBe('c1');
  });

  it('rejects fake or mismatched QR code', () => {
    const room = createMockRoom();
    const result = validateCatch(room, {
      hunterId: 'h1',
      method: 'qr',
      qrToken: 'FAKE_CODE_999',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid or expired');
  });

  it('validates proximity tag when players are close and on same floor', () => {
    const room = createMockRoom();
    const result = validateCatch(room, {
      hunterId: 'h1',
      method: 'proximity_tag',
      targetPlayerId: 'c1',
    });

    expect(result.valid).toBe(true);
    expect(result.crewmate?.id).toBe('c1');
  });

  it('rejects proximity tag when target is on a different floor', () => {
    const room = createMockRoom();
    room.players.c1.location!.floor = 2; // Floor 2 vs Floor 0

    const result = validateCatch(room, {
      hunterId: 'h1',
      method: 'proximity_tag',
      targetPlayerId: 'c1',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('same floor');
  });

  it('rejects catches during hiding phase before hunt has started', () => {
    const room = createMockRoom();
    room.phase = 'hiding';

    const result = validateCatch(room, {
      hunterId: 'h1',
      method: 'qr',
      qrToken: 'SECRET_QR_12345',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Hunt Phase');
  });
});
