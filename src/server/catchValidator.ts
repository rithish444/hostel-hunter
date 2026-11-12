import { Player, GameRoom } from '../shared/types.js';
import { calculateDistanceMeters } from '../shared/geoUtils.js';

export interface CatchAttempt {
  hunterId: string;
  method: 'qr' | 'proximity_tag';
  qrToken?: string;
  targetPlayerId?: string;
}

export interface CatchValidationResult {
  valid: boolean;
  crewmate?: Player;
  hunter?: Player;
  reason?: string;
}

/**
 * Server-authoritative catch validation.
 * Prevents remote cheating, spoofing, or fake catch claims.
 */
export function validateCatch(
  room: GameRoom,
  attempt: CatchAttempt
): CatchValidationResult {
  if (room.phase !== 'hunting') {
    return { valid: false, reason: 'Catches are only allowed during the Hunt Phase.' };
  }

  const hunter = room.players[attempt.hunterId];
  if (!hunter) {
    return { valid: false, reason: 'Hunter player not found in room.' };
  }
  if (hunter.role !== 'hunter' || hunter.status !== 'alive') {
    return { valid: false, reason: 'Only active alive hunters can make catches.' };
  }

  // Method 1: QR Code Scan (Face-to-Face verification)
  if (attempt.method === 'qr') {
    if (!attempt.qrToken) {
      return { valid: false, reason: 'QR catch token missing.' };
    }

    // Find crewmate with matching dynamic QR token
    const target = Object.values(room.players).find(
      (p) => p.role === 'crewmate' && p.status === 'alive' && p.qrCatchToken === attempt.qrToken
    );

    if (!target) {
      return { valid: false, reason: 'Invalid or expired QR catch code.' };
    }

    return { valid: true, crewmate: target, hunter };
  }

  // Method 2: Proximity Tag (Secondary / quick-tag fallback)
  if (attempt.method === 'proximity_tag') {
    if (!attempt.targetPlayerId) {
      return { valid: false, reason: 'Target player ID required for proximity tag.' };
    }

    const target = room.players[attempt.targetPlayerId];
    if (!target) {
      return { valid: false, reason: 'Target player not found.' };
    }
    if (target.role !== 'crewmate' || target.status !== 'alive') {
      return { valid: false, reason: 'Target is already caught or not a crewmate.' };
    }

    // Distance and floor check
    if (!hunter.location || !target.location) {
      return { valid: false, reason: 'Both players must have reported active locations.' };
    }

    if (hunter.location.floor !== target.location.floor) {
      return {
        valid: false,
        reason: `Hunter is on Floor ${hunter.location.floor} but Crewmate is on Floor ${target.location.floor}. Must be on same floor.`,
      };
    }

    const distance = calculateDistanceMeters(hunter.location, target.location);
    // Allow up to 15 meters to account for indoor GPS margin of error
    const MAX_TAG_DISTANCE_METERS = 15;
    if (distance > MAX_TAG_DISTANCE_METERS) {
      return {
        valid: false,
        reason: `Target is too far away (${Math.round(distance)}m > ${MAX_TAG_DISTANCE_METERS}m). Close in physically or scan their QR badge.`,
      };
    }

    return { valid: true, crewmate: target, hunter };
  }

  return { valid: false, reason: 'Unsupported catch method.' };
}

