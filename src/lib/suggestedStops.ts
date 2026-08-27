import type { RouteLeg, SuggestedStop } from '../types';

const METERS_PER_MILE = 1609.344;

// Walks each leg's turn-by-turn steps, resetting the "since last stop" budget both
// at the start of every leg (a named waypoint is itself a stop) and after every
// suggested stop, so a long leg gets broken up into <=interval segments.
export function computeSuggestedStops(
  legs: RouteLeg[],
  intervalHours: number,
  intervalMiles: number,
): SuggestedStop[] {
  if (intervalHours <= 0 && intervalMiles <= 0) return [];

  const intervalMeters = intervalMiles > 0 ? intervalMiles * METERS_PER_MILE : Infinity;
  const intervalSeconds = intervalHours > 0 ? intervalHours * 3600 : Infinity;
  const stops: SuggestedStop[] = [];

  legs.forEach((leg, legIndex) => {
    let sinceStopMeters = 0;
    let sinceStopSeconds = 0;
    let legCumulativeMeters = 0;
    let legCumulativeSeconds = 0;

    for (const step of leg.steps) {
      sinceStopMeters += step.distanceMeters;
      sinceStopSeconds += step.durationSeconds;
      legCumulativeMeters += step.distanceMeters;
      legCumulativeSeconds += step.durationSeconds;

      if (sinceStopMeters >= intervalMeters || sinceStopSeconds >= intervalSeconds) {
        stops.push({
          id: `stop-${legIndex}-${stops.length}`,
          lat: step.lat,
          lng: step.lng,
          legIndex,
          milesIntoLeg: legCumulativeMeters / METERS_PER_MILE,
          hoursIntoLeg: legCumulativeSeconds / 3600,
        });
        sinceStopMeters = 0;
        sinceStopSeconds = 0;
      }
    }
  });

  return stops;
}
