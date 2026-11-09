import { describe, it, expect } from 'vitest';
import {
  calculateDistanceMeters,
  isInsideBoundary,
  isPointInsidePolygon,
  checkRedZones,
} from '../src/shared/geoUtils.js';
import { evaluatePlayerLocation } from '../src/server/geofence.js';
import { BoundarySettings, GameRoom, Player, RedZone } from '../src/shared/types.js';

describe('Geofence & Boundary Calculations', () => {
  const center = { lat: 12.9716, lng: 77.5946 };

  it('accurately calculates Haversine distance between two points', () => {
    // 100 meters north approximately = 100 / 111320 = 0.000898 degrees
    const pointNorth = { lat: 12.9725, lng: 77.5946 };
    const dist = calculateDistanceMeters(center, pointNorth);
    expect(dist).toBeGreaterThan(95);
    expect(dist).toBeLessThan(105);
  });

  it('correctly determines whether point is inside circular boundary', () => {
    const boundary: BoundarySettings = { center, radius: 100 };

    // Point 50m away
    const insidePoint = { lat: 12.972, lng: 77.5946 };
    expect(isInsideBoundary(insidePoint, boundary)).toBe(true);

    // Point 200m away
    const outsidePoint = { lat: 12.9735, lng: 77.5946 };
    expect(isInsideBoundary(outsidePoint, boundary)).toBe(false);
  });

  it('correctly tests point in arbitrary polygon boundary', () => {
    // Square polygon around center
    const polygon = [
      { lat: 12.971, lng: 77.594 },
      { lat: 12.973, lng: 77.594 },
      { lat: 12.973, lng: 77.596 },
      { lat: 12.971, lng: 77.596 },
    ];

    expect(isPointInsidePolygon(center, polygon)).toBe(true);
    // Point far away
    expect(isPointInsidePolygon({ lat: 12.98, lng: 77.6 }, polygon)).toBe(false);
  });

  it('detects red zone incursions and respects floor restrictions', () => {
    const redZones: RedZone[] = [
      {
        id: 'rz-terrace',
        name: 'Terrace Hazard',
        center: { lat: 12.9716, lng: 77.5946 },
        radius: 30,
        floor: 4, // terrace only
        description: 'Off-limits roof',
        severity: 'danger',
      },
      {
        id: 'rz-stairs',
        name: 'Stairs Hazard',
        center: { lat: 12.9716, lng: 77.5946 },
        radius: 30,
        floor: 'all', // all floors
        description: 'Broken stairs',
        severity: 'danger',
      },
    ];

    // Player at same lat/lng but on Floor 1 (ground/dorm)
    const playerFloor1 = { ...center, floor: 1, timestamp: Date.now() };
    const hitFloor1 = checkRedZones(playerFloor1, redZones);
    // Should hit stairs, but NOT terrace
    expect(hitFloor1?.id).toBe('rz-stairs');

    // Player on Floor 4 (Terrace)
    const playerFloor4 = { ...center, floor: 4, timestamp: Date.now() };
    const hitFloor4 = checkRedZones(playerFloor4, redZones);
    expect(hitFloor4).toBeDefined();
  });

  it('enforces grace period before triggering boundary violation expired', () => {
    const player: Player = {
      id: 'p1',
      name: 'Test',
      avatar: '🏃',
      role: 'crewmate',
      isHost: false,
      isBot: false,
      status: 'alive',
      location: null,
      lastLocationUpdate: Date.now(),
      isInsideBoundary: true,
      boundaryViolationStart: null,
      currentRedZone: null,
      radarPulsesLeft: 0,
      completedTasks: [],
      qrCatchToken: '',
      emergencyMeetingsLeft: 1,
    };

    const mockRoom: GameRoom = {
      roomCode: 'TEST1',
      gameName: 'Test Room',
      hostId: 'p1',
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
      boundary: { center, radius: 50 },
      redZones: [],
      tasks: [],
      players: { p1: player },
      chatMessages: [],
      activeSos: null,
      stats: { totalCrewmates: 1, totalHunters: 0, caughtCrewmates: 0, tasksCompleted: 0, totalTasks: 0, catches: [], sosAlerts: [] },
    };

    // Outside boundary step 1 (0 seconds elapsed)
    const outsideLoc = { lat: 12.975, lng: 77.598, floor: 0, timestamp: Date.now() };
    const eval1 = evaluatePlayerLocation(player, outsideLoc, mockRoom);
    expect(eval1.isInsideBoundary).toBe(false);
    expect(eval1.boundaryGraceExpired).toBe(false);
    expect(eval1.secondsRemainingInGrace).toBe(15);

    // Simulate 16 seconds having elapsed
    player.boundaryViolationStart = Date.now() - 16000;
    const eval2 = evaluatePlayerLocation(player, outsideLoc, mockRoom);
    expect(eval2.boundaryGraceExpired).toBe(true);
    expect(eval2.secondsRemainingInGrace).toBe(0);

    // Player steps back inside
    const insideLoc = { ...center, floor: 0, timestamp: Date.now() };
    const eval3 = evaluatePlayerLocation(player, insideLoc, mockRoom);
    expect(eval3.isInsideBoundary).toBe(true);
    expect(player.boundaryViolationStart).toBeNull();
  });
});
