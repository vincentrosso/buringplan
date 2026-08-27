import { useEffect, useRef, useState } from 'react';
import { haversineMeters, isPlausiblePing, metersToMiles, mpsToMph } from '../lib/geo';
import { addPing, newTripId, saveDaySummary } from '../store/tripLog';
import type { GpsPing } from '../types';

interface TrackerControlsProps {
  onPositionChange?: (position: { lat: number; lng: number } | null) => void;
  onSessionSaved?: () => void;
}

export default function TrackerControls({ onPositionChange, onSessionSaved }: TrackerControlsProps) {
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSpeedMph, setCurrentSpeedMph] = useState(0);
  const [maxSpeedMph, setMaxSpeedMph] = useState(0);
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const tripIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastAcceptedRef = useRef<GpsPing | null>(null);
  const distanceMetersRef = useRef(0);
  const maxSpeedMphRef = useRef(0);

  useEffect(() => {
    if (!tracking) return;
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedSeconds(Math.round((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [tracking]);

  function handlePosition(position: GeolocationPosition) {
    const { latitude, longitude, speed, heading, accuracy } = position.coords;
    const timestamp = position.timestamp;
    const candidate = { lat: latitude, lng: longitude, timestamp, accuracy };

    onPositionChange?.({ lat: latitude, lng: longitude });

    if (!isPlausiblePing(lastAcceptedRef.current, candidate)) return;

    const tripId = tripIdRef.current;
    if (!tripId) return;

    if (lastAcceptedRef.current) {
      distanceMetersRef.current += haversineMeters(lastAcceptedRef.current, candidate);
      setDistanceMiles(metersToMiles(distanceMetersRef.current));
    }

    const speedMph = speed != null ? mpsToMph(speed) : 0;
    setCurrentSpeedMph(speedMph);
    if (speedMph > maxSpeedMphRef.current) {
      maxSpeedMphRef.current = speedMph;
      setMaxSpeedMph(speedMph);
    }

    const ping: GpsPing = {
      tripId,
      lat: latitude,
      lng: longitude,
      speedMps: speed,
      heading,
      accuracy,
      timestamp,
    };
    lastAcceptedRef.current = ping;
    void addPing(ping);
  }

  function handleStart() {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not available in this browser.');
      return;
    }
    setError(null);
    tripIdRef.current = newTripId();
    startTimeRef.current = Date.now();
    lastAcceptedRef.current = null;
    distanceMetersRef.current = 0;
    maxSpeedMphRef.current = 0;
    setDistanceMiles(0);
    setMaxSpeedMph(0);
    setCurrentSpeedMph(0);
    setElapsedSeconds(0);

    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, (err) => setError(err.message), {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 30000,
    });
    setTracking(true);
  }

  async function handleStop() {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    onPositionChange?.(null);

    const tripId = tripIdRef.current;
    const startTime = startTimeRef.current;
    if (tripId && startTime) {
      const endTime = Date.now();
      const durationSeconds = (endTime - startTime) / 1000;
      await saveDaySummary({
        tripId,
        startTime,
        endTime,
        distanceMiles: metersToMiles(distanceMetersRef.current),
        avgSpeedMph: durationSeconds > 0 ? metersToMiles(distanceMetersRef.current) / (durationSeconds / 3600) : 0,
        maxSpeedMph: maxSpeedMphRef.current,
        durationSeconds,
      });
      onSessionSaved?.();
    }
    tripIdRef.current = null;
    startTimeRef.current = null;
  }

  return (
    <div className="tracker-controls">
      <div className="tracker-buttons">
        {!tracking ? (
          <button type="button" onClick={handleStart} className="tracker-start-btn">
            Start tracking
          </button>
        ) : (
          <button type="button" onClick={() => void handleStop()} className="tracker-stop-btn">
            Stop &amp; save
          </button>
        )}
      </div>

      {error && <p className="tracker-error">{error}</p>}

      <div className="tracker-readout">
        <div>
          <span className="tracker-readout-value">{currentSpeedMph.toFixed(0)}</span>
          <span className="tracker-readout-label">mph</span>
        </div>
        <div>
          <span className="tracker-readout-value">{distanceMiles.toFixed(1)}</span>
          <span className="tracker-readout-label">mi this session</span>
        </div>
        <div>
          <span className="tracker-readout-value">{maxSpeedMph.toFixed(0)}</span>
          <span className="tracker-readout-label">max mph</span>
        </div>
        <div>
          <span className="tracker-readout-value">
            {String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')}:
            {String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:
            {String(elapsedSeconds % 60).padStart(2, '0')}
          </span>
          <span className="tracker-readout-label">elapsed</span>
        </div>
      </div>
    </div>
  );
}
