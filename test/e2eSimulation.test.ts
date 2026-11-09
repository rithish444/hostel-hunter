import { describe, it, expect, vi } from 'vitest';
import { GameManager } from '../src/server/gameManager.js';
import { GameStorage } from '../src/server/storage.js';

describe('End-to-End Simulation & Game Lifecycle', () => {
  it('runs complete multiplayer game loop with bots, catches, and state transitions', () => {
    const storage = new GameStorage();
    const broadcastEvents: { event: string; payload: any }[] = [];

    const gm = new GameManager(storage, {
      onStateChange: () => {},
      onBroadcastEvent: (_roomCode, event, payload) => {
        broadcastEvents.push({ event, payload });
      },
    });

    // 1. Host creates room
    const { room, hostPlayer } = gm.createRoom('Host Alice', 'Hostel Block A Hunt', {
      durationMinutes: 5,
      hidingTimeSeconds: 2,
      hunterCount: 2,
      updateIntervalSeconds: 10,
      proximityWarningMeters: 15,
      blurRadiusMeters: 30,
      gracePeriodSeconds: 15,
      allowTaskWin: true,
    });

    expect(room.roomCode).toBeDefined();
    expect(room.phase).toBe('lobby');
    expect(hostPlayer.isHost).toBe(true);

    // 2. Additional real players join
    const p2 = gm.joinRoom(room.roomCode, 'Bob Runner');
    const p3 = gm.joinRoom(room.roomCode, 'Charlie Sneak');
    expect(p2.success).toBe(true);
    expect(p3.success).toBe(true);
    expect(Object.keys(room.players).length).toBe(3);

    // 3. Host adds 4 simulated bot players
    const botRes = gm.addBots(room.roomCode, hostPlayer.id, 4);
    expect(botRes.success).toBe(true);
    expect(botRes.addedCount).toBe(4);
    expect(Object.keys(room.players).length).toBe(7);

    // 4. Start Match: Server role assignment
    const startRes = gm.startGame(room.roomCode, hostPlayer.id);
    expect(startRes.success).toBe(true);
    expect(room.phase).toBe('hiding');
    expect(room.stats.totalHunters).toBe(2);
    expect(room.stats.totalCrewmates).toBe(5);

    // 5. Test State Sanitization / Anti-Cheat
    // Find a non-host hunter and non-host crewmate
    const nonHostCrewmate = Object.values(room.players).find((p) => !p.isHost && p.role === 'crewmate')!;
    const nonHostHunter = Object.values(room.players).find((p) => !p.isHost && p.role === 'hunter')!;

    // Non-host crewmate view: adversary hunter role and location MUST BE HIDDEN
    const crewmateClientState = gm.generateClientState(room.roomCode, nonHostCrewmate.id);
    expect(crewmateClientState?.myRole).toBe('crewmate');
    const adversaryInCrewmateView = crewmateClientState?.players.find((p) => p.id === nonHostHunter.id);
    expect(adversaryInCrewmateView?.role).toBeUndefined(); // Adversary role HIDDEN
    expect(adversaryInCrewmateView?.location).toBeUndefined(); // Hunter position HIDDEN

    // 6. Transition to Hunt phase
    room.phase = 'hunting';

    // 7. Test Radar Pulse Power-Up
    expect(nonHostHunter.radarPulsesLeft).toBe(3);
    const pulseRes = gm.activateRadarPulse(room.roomCode, nonHostHunter.id);
    expect(pulseRes.success).toBe(true);
    expect(pulseRes.pulsesRemaining).toBe(2);

    // 8. Catch target via Dynamic QR code
    const catchRes = gm.catchPlayer(
      room.roomCode,
      nonHostHunter.id,
      'qr',
      nonHostCrewmate.qrCatchToken
    );
    expect(catchRes.success).toBe(true);
    expect(nonHostCrewmate.status).toBe('caught');
    expect(nonHostCrewmate.caughtBy?.id).toBe(nonHostHunter.id);

    // Spectator view after catch: eliminated player can now observe game
    const spectatorState = gm.generateClientState(room.roomCode, nonHostCrewmate.id);
    expect(spectatorState?.self.status).toBe('caught');

    // 9. Host emergency SOS response
    const sosRes = gm.triggerSOS(room.roomCode, p2.player!.id);
    expect(sosRes.success).toBe(true);
    expect(room.activeSos).toBeDefined();

    const resolveRes = gm.resolveSOS(room.roomCode, hostPlayer.id);
    expect(resolveRes).toBe(true);
    expect(room.activeSos).toBeNull();

    // 10. End Game and verify match history
    gm.endGame(room.roomCode, 'hunters', 'All crewmates captured');
    expect(room.phase).toBe('ended');
    expect(room.winner).toBe('hunters');

    const matches = storage.getMatches();
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].roomCode).toBe(room.roomCode);
    expect(matches[0].winner).toBe('hunters');
  });
});
