import { useEffect, useState } from 'react';
import { fetchRouteLegs } from '../lib/directions';
import { metersToMiles } from '../lib/geo';
import { useTripStore } from '../store/tripStore';
import type { RouteLeg } from '../types';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

interface RouteStatsProps {
  onLegsLoaded?: (legs: RouteLeg[]) => void;
}

export default function RouteStats({ onLegsLoaded }: RouteStatsProps) {
  const waypoints = useTripStore((s) => s.waypoints);
  const [legs, setLegs] = useState<RouteLeg[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    if (waypoints.length < 2) {
      setLegs([]);
      return;
    }
    let cancelled = false;
    setStatus('loading');
    fetchRouteLegs(waypoints)
      .then((result) => {
        if (cancelled) return;
        setLegs(result);
        setStatus('idle');
        onLegsLoaded?.(result);
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints]);

  if (waypoints.length < 2) {
    return <p className="route-stats-empty">Add at least two stops to see route stats.</p>;
  }
  if (status === 'loading' && legs.length === 0) {
    return <p>Calculating route...</p>;
  }
  if (status === 'error') {
    return <p className="route-stats-error">Couldn't calculate the route. Check the API key/quota.</p>;
  }

  const totalMeters = legs.reduce((sum, leg) => sum + leg.distanceMeters, 0);
  const totalSeconds = legs.reduce((sum, leg) => sum + leg.durationSeconds, 0);

  return (
    <div className="route-stats">
      <div className="route-stats-total">
        <strong>{metersToMiles(totalMeters).toFixed(0)} mi</strong> total &middot;{' '}
        <strong>{formatDuration(totalSeconds)}</strong> driving
      </div>
      <ol className="route-stats-legs">
        {legs.map((leg, i) => (
          <li key={`${leg.fromId}-${leg.toId}`}>
            Leg {i + 1}: {metersToMiles(leg.distanceMeters).toFixed(0)} mi &middot;{' '}
            {formatDuration(leg.durationSeconds)}
          </li>
        ))}
      </ol>
      <p className="route-stats-caveat">
        Google Directions has no truck/trailer height or weight-restricted routing mode
        &mdash; sanity-check any mountain passes (e.g. near Denver) manually.
      </p>
    </div>
  );
}
