import { describe, it, expect } from 'vitest';
import { assignRoles } from '../src/server/roleAssignment.js';
import { Player } from '../src/shared/types.js';

function createMockPlayers(count: number): Record<string, Player> {
  const players: Record<string, Player> = {};
  for (let i = 1; i <= count; i++) {
    const id = `p${i}`;
    players[id] = {
      id,
      name: `Player ${i}`,
      avatar: '👤',
      role: null,
      isHost: i === 1,
      isBot: false,
      status: 'alive',
      location: null,
      lastLocationUpdate: Date.now(),
      isInsideBoundary: true,
      boundaryViolationStart: null,
      currentRedZone: null,
      radarPulsesLeft: 3,
      completedTasks: [],
      qrCatchToken: '',
      emergencyMeetingsLeft: 1,
    };
  }
  return players;
}

describe('Server Authoritative Role Assignment', () => {
  it('rejects matches with fewer than 2 players', () => {
    const players = createMockPlayers(1);
    const result = assignRoles(players, 1);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('correctly assigns requested number of hunters and crewmates for 12 players', () => {
    const players = createMockPlayers(12);
    const result = assignRoles(players, 3);

    expect(result.success).toBe(true);
    expect(result.hunters.length).toBe(3);
    expect(result.crewmates.length).toBe(9);

    // Verify all players have assigned role and dynamic QR catch token
    for (const hId of result.hunters) {
      expect(players[hId].role).toBe('hunter');
      expect(players[hId].status).toBe('alive');
    }
    for (const cId of result.crewmates) {
      expect(players[cId].role).toBe('crewmate');
      expect(players[cId].status).toBe('alive');
      expect(players[cId].qrCatchToken).toMatch(/^CATCH_/);
    }
  });

  it('clamps hunter count to valid range (1 to N-1)', () => {
    const players = createMockPlayers(4);
    // Request 10 hunters when only 4 players exist
    const result = assignRoles(players, 10);
    expect(result.success).toBe(true);
    expect(result.hunters.length).toBe(3); // Max N-1 = 3
    expect(result.crewmates.length).toBe(1);
  });

  it('generates distinct secret dynamic catch tokens for each crewmate', () => {
    const players = createMockPlayers(6);
    const result = assignRoles(players, 2);
    expect(result.success).toBe(true);

    const tokens = result.crewmates.map((id) => players[id].qrCatchToken);
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(tokens.length);
  });
});
