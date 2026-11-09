import { describe, it, expect } from 'vitest';
import { GameManager } from '../src/server/gameManager.js';
import { GameStorage } from '../src/server/storage.js';

describe('Win Conditions & Game Cycle Logic', () => {
  it('triggers hunter win when all crewmates are caught', () => {
    const storage = new GameStorage();
    let broadcastEvents: { event: string; payload: any }[] = [];

    const gm = new GameManager(storage, {
      onStateChange: () => {},
      onBroadcastEvent: (_code, event, payload) => {
        broadcastEvents.push({ event, payload });
      },
    });

    const { room, hostPlayer } = gm.createRoom('Host Bob', 'Win Test Room', {
      durationMinutes: 5,
      hidingTimeSeconds: 1,
      hunterCount: 1,
    });

    // Add 1 extra player (crewmate)
    const joinRes = gm.joinRoom(room.roomCode, 'Alice');
    expect(joinRes.success).toBe(true);

    // Start game
    const startRes = gm.startGame(room.roomCode, hostPlayer.id);
    expect(startRes.success).toBe(true);

    const hunterId = Object.values(room.players).find((p) => p.role === 'hunter')!.id;
    const crewmate = Object.values(room.players).find((p) => p.role === 'crewmate')!;

    // Move room to hunting phase for catch
    room.phase = 'hunting';

    // Catch the crewmate
    const catchRes = gm.catchPlayer(
      room.roomCode,
      hunterId,
      'qr',
      crewmate.qrCatchToken
    );

    expect(catchRes.success).toBe(true);
    expect(room.phase).toBe('ended');
    expect(room.winner).toBe('hunters');
    expect(room.winReason).toContain('eliminated all crewmates');
  });

  it('triggers crewmate win when time expires with living survivors', () => {
    const storage = new GameStorage();
    const gm = new GameManager(storage, {
      onStateChange: () => {},
      onBroadcastEvent: () => {},
    });

    const { room, hostPlayer } = gm.createRoom('Host', 'Survival Room', {
      durationMinutes: 1,
      hidingTimeSeconds: 1,
      hunterCount: 1,
    });

    gm.joinRoom(room.roomCode, 'Survivor 1');
    gm.startGame(room.roomCode, hostPlayer.id);

    // Simulate hunting phase timer expiration
    room.phase = 'hunting';
    room.phaseEndTime = Date.now() - 1000; // already expired

    // Trigger tick
    (gm as any).tickRoom(room.roomCode);

    expect(room.phase).toBe('ended');
    expect(room.winner).toBe('crewmates');
    expect(room.winReason).toContain('survived');
  });

  it('triggers crewmate win when all hostel tasks are finished', () => {
    const storage = new GameStorage();
    const gm = new GameManager(storage, {
      onStateChange: () => {},
      onBroadcastEvent: () => {},
    });

    const { room, hostPlayer } = gm.createRoom('Host', 'Task Room', {
      durationMinutes: 10,
      hidingTimeSeconds: 1,
      hunterCount: 1,
      allowTaskWin: true,
    });

    gm.joinRoom(room.roomCode, 'Worker Bee');
    gm.startGame(room.roomCode, hostPlayer.id);
    room.phase = 'hunting';

    const crewmate = Object.values(room.players).find((p) => p.role === 'crewmate')!;

    // Complete all tasks
    for (const task of room.tasks) {
      gm.completeTask(room.roomCode, crewmate.id, task.id, task.code);
    }

    expect(room.phase).toBe('ended');
    expect(room.winner).toBe('crewmates');
    expect(room.winReason).toContain('All tasks completed');
  });
});
