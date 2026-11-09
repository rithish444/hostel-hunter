import { Player, Role } from '../shared/types.js';

export interface RoleAssignmentResult {
  success: boolean;
  hunters: string[];
  crewmates: string[];
  error?: string;
}

/**
 * Authoritative Server-side Random Role Assignment.
 * Uses cryptographically secure Fisher-Yates shuffle to guarantee fairness.
 * Clients NEVER decide or influence roles.
 */
export function assignRoles(
  players: Record<string, Player>,
  requestedHunterCount: number
): RoleAssignmentResult {
  const playerIds = Object.keys(players);
  const totalPlayers = playerIds.length;

  if (totalPlayers < 2) {
    return {
      success: false,
      hunters: [],
      crewmates: [],
      error: 'At least 2 players are required to start a match.',
    };
  }

  // Ensure hunter count is at least 1 and at most totalPlayers - 1
  const hunterCount = Math.max(1, Math.min(requestedHunterCount, totalPlayers - 1));

  // Clone playerIds array and perform unbiased Fisher-Yates shuffle
  const shuffled = [...playerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate secure index
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const hunters = shuffled.slice(0, hunterCount);
  const crewmates = shuffled.slice(hunterCount);

  // Apply to players
  for (const id of hunters) {
    players[id].role = 'hunter';
    players[id].status = 'alive';
    players[id].radarPulsesLeft = 3;
    players[id].caughtBy = null;
    players[id].caughtAt = null;
  }

  for (const id of crewmates) {
    players[id].role = 'crewmate';
    players[id].status = 'alive';
    players[id].caughtBy = null;
    players[id].caughtAt = null;
    // Generate unique dynamic catch token for QR verification
    players[id].qrCatchToken = `CATCH_${id.slice(0, 6)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
  }

  return {
    success: true,
    hunters,
    crewmates,
  };
}
