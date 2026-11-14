import { useState, useEffect, useRef, useCallback } from 'react';
import { LatLngWithFloor } from '../../shared/types.js';
import { GpsCoordinateSmoother } from '../../shared/geoUtils.js';

interface UseGeolocationOptions {
  defaultCenter?: { lat: number; lng: number };
  initialFloor?: number;
  onLocationChange?: (location: LatLngWithFloor) => void;
}

export function useGeolocation({
  defaultCenter = { lat: 11.1005, lng: 76.9683 },
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
  const [hasRealGpsFix, setHasRealGpsFix] = useState<boolean>(false);

  const smootherRef = useRef(new GpsCoordinateSmoother(0.5));
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
        accuracy: 3, // High confidence after scanning verified checkpoint
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
        accuracy: 3,
        timestamp: Date.now(),
      };
      onLocationChangeRef.current?.(updated);
      return updated;
    });
  }, [currentFloor]);

  // Manually pinpoint exact location / room on building map
  const setExactLocation = useCallback((coords: { lat: number; lng: number; floor?: number }) => {
    setIsUsingSimulatedLocation(true);
    setGpsAccuracy(3);
    setAccuracyQuality('high');
    setHasRealGpsFix(true);
    setCurrentLocation((prev) => {
      const updated: LatLngWithFloor = {
        lat: Number(coords.lat.toFixed(6)),
        lng: Number(coords.lng.toFixed(6)),
        floor: coords.floor !== undefined ? coords.floor : currentFloor,
        accuracy: 3,
        timestamp: Date.now(),
      };
      onLocationChangeRef.current?.(updated);
      return updated;
    });
  }, [currentFloor]);

  const resumeRealGps = useCallback(() => {
    setIsUsingSimulatedLocation(false);
  }, []);

  const handlePositionSuccess = useCallback((pos: GeolocationPosition) => {
    if (isUsingSimulatedLocation) return;

    const accuracy = pos.coords.accuracy || 15;
    setGpsAccuracy(accuracy);
    setHasRealGpsFix(true);
    setGpsError(null);

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
  }, [currentFloor, isUsingSimulatedLocation]);

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    // Step 1: Immediate fast acquisition (allow cached network/wifi location up to 60s)
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      (err) => {
        console.warn('[useGeolocation] Fast network location check:', err.message);
        if (err.code === 1) {
          setGpsError('Location permission denied. Please allow location in your browser.');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 60000,
      }
    );

    // Step 2: Continuous high-accuracy watcher with indoor-tolerant settings
    const startWatcher = () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        (err) => {
          console.warn('[useGeolocation] Watch error:', err.code, err.message);
          if (err.code === 1) {
            setGpsError('Location permission denied. Please allow location in your browser.');
          } else if (err.code === 3) {
            // Timeout: retry with Wi-Fi / cell positioning
            navigator.geolocation.getCurrentPosition(
              handlePositionSuccess,
              () => {},
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 15000 }
            );
          } else {
            setGpsError(err.message);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      );
    };

    startWatcher();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [handlePositionSuccess]);

  return {
    currentLocation,
    currentFloor,
    gpsAccuracy,
    accuracyQuality,
    gpsError,
    hasRealGpsFix,
    isUsingSimulatedLocation,
    setFloor,
    calibrateFloorCheckpoint,
    nudgeLocation,
    setExactLocation,
    resumeRealGps,
    setIsUsingSimulatedLocation,
  };
}
