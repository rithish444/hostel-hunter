import { describe, it, expect } from 'vitest';
import {
  isHunterNearby,
  generateBlurredLocation,
  GpsCoordinateSmoother,
  calculateDistanceMeters,
} from '../src/shared/geoUtils.js';
import { LatLngWithFloor } from '../src/shared/types.js';

describe('Proximity & Obfuscation Logic', () => {
  const crewmateLoc: LatLngWithFloor = {
    lat: 12.9716,
    lng: 77.5946,
    floor: 1,
    timestamp: Date.now(),
  };

  it('triggers proximity warning when hunter is within 15 meters on same floor', () => {
    // 8 meters away
    const hunterLoc: LatLngWithFloor = {
      lat: 12.97165,
      lng: 77.5946,
      floor: 1,
      timestamp: Date.now(),
    };

    const result = isHunterNearby(crewmateLoc, [hunterLoc], 15, 1);
    expect(result.nearby).toBe(true);
    expect(result.count).toBe(1);
    expect(result.closestDistance).toBeLessThanOrEqual(15);
  });

  it('ignores hunters who are too many floors away even if horizontally close', () => {
    // 5 meters horizontally, but 3 floors away (e.g. Floor 1 vs Floor 4)
    const hunterLoc: LatLngWithFloor = {
      lat: 12.97162,
      lng: 77.5946,
      floor: 4,
      timestamp: Date.now(),
    };

    const result = isHunterNearby(crewmateLoc, [hunterLoc], 15, 1);
    expect(result.nearby).toBe(false);
  });

  it('generates blurred target coordinates with non-zero offset to prevent exact pinpointing', () => {
    const blurRadius = 35;
    const blurred = generateBlurredLocation(crewmateLoc, blurRadius);

    expect(blurred.radiusMeters).toBe(blurRadius);
    const offset = calculateDistanceMeters(crewmateLoc, blurred.centroid);

    // Offset should be between 30% and 75% of blur radius (e.g. 10.5m to 26.25m)
    expect(offset).toBeGreaterThan(9);
    expect(offset).toBeLessThan(30);
  });

  it('smooths noisy GPS readings with exponential moving average', () => {
    const smoother = new GpsCoordinateSmoother(0.5);

    const initial = smoother.update({
      lat: 12.9716,
      lng: 77.5946,
      floor: 1,
      accuracy: 20,
      timestamp: Date.now(),
    });

    expect(initial.lat).toBe(12.9716);

    // Jittered reading jumps 20 meters
    const jump = smoother.update({
      lat: 12.9718,
      lng: 77.5946,
      floor: 1,
      accuracy: 25,
      timestamp: Date.now(),
    });

    // The smoothed reading should be between 12.9716 and 12.9718, dampening the jump
    expect(jump.lat).toBeGreaterThan(12.9716);
    expect(jump.lat).toBeLessThan(12.9718);
  });
});

