import { useState, useEffect, useRef, useCallback } from 'react';
import { LatLngWithFloor } from '../../shared/types.js';
import { GpsCoordinateSmoother } from '../../shared/geoUtils.js';

interface UseGeolocationOptions {
  defaultCenter?: { lat: number; lng: number };
  initialFloor?: number;
  onLocationChange?: (location: LatLngWithFloor) => void;
}

export function useGeolocation({
  defaultCenter = { lat: 12.9716, lng: 77.5946 },
  initialFloor = 0,
  onLocationChange,
}: UseGeolocationOptions = {}) {
  const [currentLocation, setCurrentLocation] = useState<LatLngWithFloor>({
    lat: defaultCenter.lat,
    lng: defaultCenter.lng,
    floor: initialFloor,
    accuracy: 10,
    timestamp: Date.now(),
  });

  const [currentFloor, setCurrentFloor] = useState<number>(initialFloor);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(10);
  const [accuracyQuality, setAccuracyQuality] = useState<'high' | 'medium' | 'low'>('medium');
  const [isUsingSimulatedLocation, setIsUsingSimulatedLocation] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const smootherRef = useRef(new GpsCoordinateSmoother(0.4));
  const watchIdRef = useRef<number | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;

  // Floor update handler
  const setFloor = useCallback((newFloor: number) => {
    setCurrentFloor(newFloor);
    setCurrentLocation((prev) => {
      const updated: LatLngWithFloor = {
        ...prev,
        floor: newFloor,
        timestamp: Date.now(),
      };
      onLocationChangeRef.current?.(updated);
      return updated;
    });
  }, []);

  // Checkpoint anchor calibrate (e.g. from QR scan)
  const calibrateFloorCheckpoint = useCallback((floorLevel: number, anchorCoords?: { lat: number; lng: number }) => {
    setCurrentFloor(floorLevel);
    setCurrentLocation((prev) => {
      const updated: LatLngWithFloor = {
        lat: anchorCoords ? anchorCoords.lat : prev.lat,
        lng: anchorCoords ? anchorCoords.lng : prev.lng,
        floor: floorLevel,
        accuracy: 5, // High confidence after scanning verified checkpoint
        timestamp: Date.now(),
      };
      onLocationChangeRef.current?.(updated);
      return updated;
    });
  }, []);

  // Simulated coordinate nudging for testing
  const nudgeLocation = useCallback((deltaLat: number, deltaLng: number) => {
    setIsUsingSimulatedLocation(true);
    setCurrentLocation((prev) => {
      const updated: LatLngWithFloor = {
        lat: Number((prev.lat + deltaLat).toFixed(6)),
        lng: Number((prev.lng + deltaLng).toFixed(6)),
        floor: currentFloor,
        accuracy: 5,
        timestamp: Date.now(),
      };
      onLocationChangeRef.current?.(updated);
      return updated;
    });
  }, [currentFloor]);

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (isUsingSimulatedLocation) return;

        const accuracy = pos.coords.accuracy || 15;
        setGpsAccuracy(accuracy);

        if (accuracy <= 12) {
          setAccuracyQuality('high');
        } else if (accuracy <= 30) {
          setAccuracyQuality('medium');
        } else {
          setAccuracyQuality('low');
        }

        const raw: LatLngWithFloor = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          floor: currentFloor,
          accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp || Date.now(),
        };

        const smoothed = smootherRef.current.update(raw);
        setCurrentLocation(smoothed);
        onLocationChangeRef.current?.(smoothed);
      },
      (err) => {
        // Fallback gracefully on indoor denial or timeout
        console.warn('[useGeolocation] Warning:', err.message);
        setGpsError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [currentFloor, isUsingSimulatedLocation]);

  return {
    currentLocation,
    currentFloor,
    gpsAccuracy,
    accuracyQuality,
    gpsError,
    isUsingSimulatedLocation,
    setFloor,
    calibrateFloorCheckpoint,
    nudgeLocation,
    setIsUsingSimulatedLocation,
  };
}

