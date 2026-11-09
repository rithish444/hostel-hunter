import { useCallback } from 'react';

export function useVibration() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        // Ignored on platforms where vibration is restricted
      }
    }
  }, []);

  const vibrateProximityPulse = useCallback(() => {
    vibrate([150, 100, 150]);
  }, [vibrate]);

  const vibrateDangerAlarm = useCallback(() => {
    vibrate([350, 100, 350, 100, 500]);
  }, [vibrate]);

  const vibrateCatchHit = useCallback(() => {
    vibrate([600]);
  }, [vibrate]);

  const vibrateTap = useCallback(() => {
    vibrate([25]);
  }, [vibrate]);

  return {
    vibrate,
    vibrateProximityPulse,
    vibrateDangerAlarm,
    vibrateCatchHit,
    vibrateTap,
  };
}
