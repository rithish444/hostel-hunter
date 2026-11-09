import { LatLng, LatLngWithFloor, BoundarySettings, RedZone } from './types.js';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates great-circle distance between two coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateDistanceMeters(p1: LatLng, p2: LatLng): number {
  const dLat = toRadians(p2.lat - p1.lat);
  const dLng = toRadians(p2.lng - p1.lng);
  const lat1 = toRadians(p1.lat);
  const lat2 = toRadians(p2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Checks whether a given point is inside a polygon using ray casting algorithm.
 */
export function isPointInsidePolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Validates if a player position is within the defined boundary (circle or polygon).
 */
export function isInsideBoundary(point: LatLng, boundary: BoundarySettings): boolean {
  if (boundary.points && boundary.points.length >= 3) {
    return isPointInsidePolygon(point, boundary.points);
  }
  const dist = calculateDistanceMeters(point, boundary.center);
  return dist <= boundary.radius;
}

/**
 * Checks if a player is in any restricted red zone.
 * Takes floor into account if floor is specified.
 */
export function checkRedZones(location: LatLngWithFloor, redZones: RedZone[]): RedZone | null {
  for (const zone of redZones) {
    // If zone specifies a floor and player is on a different floor, skip
    if (zone.floor !== 'all' && zone.floor !== undefined && zone.floor !== location.floor) {
      continue;
    }
    const dist = calculateDistanceMeters(location, zone.center);
    if (dist <= zone.radius) {
      return zone;
    }
  }
  return null;
}

/**
 * Calculates proximity: returns true if any hunter is within warning distance on the same or adjacent floor.
 */
export function isHunterNearby(
  target: LatLngWithFloor,
  hunters: LatLngWithFloor[],
  warningDistanceMeters = 15,
  floorTolerance = 1 // adjacent floor alert
): { nearby: boolean; count: number; closestDistance: number } {
  let count = 0;
  let closest = Infinity;

  for (const hunter of hunters) {
    const floorDiff = Math.abs(hunter.floor - target.floor);
    if (floorDiff > floorTolerance) {
      continue;
    }

    const dist = calculateDistanceMeters(target, hunter);
    if (dist <= warningDistanceMeters) {
      count++;
      if (dist < closest) {
        closest = dist;
      }
    }
  }

  return {
    nearby: count > 0,
    count,
    closestDistance: closest === Infinity ? 0 : Math.round(closest),
  };
}

/**
 * Generates an obfuscated/blurred centroid for hunters.
 * Shifts the real point by an intentional random jitter (30%-70% of radius)
 * so hunters can never pinpoint the exact center.
 */
export function generateBlurredLocation(
  actual: LatLngWithFloor,
  blurRadiusMeters = 35
): { centroid: LatLng; radiusMeters: number } {
  // Angular displacement in radians
  const angle = Math.random() * 2 * Math.PI;
  // Offset distance between 30% and 75% of blur radius
  const offsetDistance = blurRadiusMeters * (0.3 + Math.random() * 0.45);

  // Approximate meter to lat/lng degree conversion:
  // 1 deg latitude ≈ 111,320 meters
  // 1 deg longitude ≈ 111,320 * cos(lat) meters
  const deltaLat = (offsetDistance * Math.cos(angle)) / 111320;
  const deltaLng = (offsetDistance * Math.sin(angle)) / (111320 * Math.cos(toRadians(actual.lat)));

  return {
    centroid: {
      lat: Number((actual.lat + deltaLat).toFixed(6)),
      lng: Number((actual.lng + deltaLng).toFixed(6)),
    },
    radiusMeters: blurRadiusMeters,
  };
}

/**
 * Exponential Moving Average (EMA) filter for GPS coordinates.
 * Dampens sudden indoor jumps when GPS accuracy fluctuates.
 */
export class GpsCoordinateSmoother {
  private alpha: number;
  private current: LatLngWithFloor | null = null;

  constructor(alpha = 0.4) {
    this.alpha = alpha; // Higher alpha = more responsive, lower = smoother
  }

  public update(reading: LatLngWithFloor): LatLngWithFloor {
    if (!this.current) {
      this.current = { ...reading };
      return this.current;
    }

    // If floor changed, immediately update floor without smoothing lat/lng abruptly
    if (this.current.floor !== reading.floor) {
      this.current.floor = reading.floor;
    }

    // Weight alpha based on accuracy: if reading has poor accuracy (>25m), rely more on previous position
    let effectiveAlpha = this.alpha;
    if (reading.accuracy && reading.accuracy > 30) {
      effectiveAlpha = 0.2; // dampen aggressively on poor accuracy
    } else if (reading.accuracy && reading.accuracy < 10) {
      effectiveAlpha = 0.7; // trust high accuracy readings
    }

    const smoothedLat = this.current.lat + effectiveAlpha * (reading.lat - this.current.lat);
    const smoothedLng = this.current.lng + effectiveAlpha * (reading.lng - this.current.lng);

    this.current = {
      ...reading,
      lat: Number(smoothedLat.toFixed(6)),
      lng: Number(smoothedLng.toFixed(6)),
    };

    return this.current;
  }

  public reset(): void {
    this.current = null;
  }
}
