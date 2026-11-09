import { Player, GameRoom, LatLngWithFloor, RedZone } from '../shared/types.js';
import { isInsideBoundary, checkRedZones } from '../shared/geoUtils.js';

export interface LocationEvaluationResult {
  isInsideBoundary: boolean;
  boundaryGraceExpired: boolean;
  secondsRemainingInGrace: number;
  enteredRedZone: RedZone | null;
  exitedRedZone: string | null;
}

/**
 * Evaluates a player's new location report against game room boundaries and red zones.
 */
export function evaluatePlayerLocation(
  player: Player,
  location: LatLngWithFloor,
  room: GameRoom
): LocationEvaluationResult {
  const inside = isInsideBoundary(location, room.boundary);
  const now = Date.now();

  let boundaryGraceExpired = false;
  let secondsRemainingInGrace = room.settings.gracePeriodSeconds;

  if (!inside) {
    if (!player.boundaryViolationStart) {
      player.boundaryViolationStart = now;
    }
    const elapsedSeconds = (now - player.boundaryViolationStart) / 1000;
    secondsRemainingInGrace = Math.max(0, Math.ceil(room.settings.gracePeriodSeconds - elapsedSeconds));
    if (elapsedSeconds >= room.settings.gracePeriodSeconds) {
      boundaryGraceExpired = true;
    }
  } else {
    // Player returned inside boundary, reset violation
    player.boundaryViolationStart = null;
  }

  player.isInsideBoundary = inside;

  // Red Zone evaluation
  const currentZone = checkRedZones(location, room.redZones);
  let enteredRedZone: RedZone | null = null;
  let exitedRedZone: string | null = null;

  if (currentZone && player.currentRedZone !== currentZone.id) {
    enteredRedZone = currentZone;
    player.currentRedZone = currentZone.id;
  } else if (!currentZone && player.currentRedZone) {
    exitedRedZone = player.currentRedZone;
    player.currentRedZone = null;
  }

  return {
    isInsideBoundary: inside,
    boundaryGraceExpired,
    secondsRemainingInGrace,
    enteredRedZone,
    exitedRedZone,
  };
}
