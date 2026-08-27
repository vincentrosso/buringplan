import type { RouteLeg, SuggestedStop, Waypoint } from '../types';

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

// Shared by SuggestedStops.tsx (sidebar "Add as waypoint") and MapView.tsx (the
// same action from the marker's info window), so both promote a suggested stop
// into a real waypoint identically. The insertion index is stop.legIndex + 1
// (the leg from waypoints[legIndex] to waypoints[legIndex + 1]).
export function suggestedStopToWaypoint(stop: SuggestedStop): Omit<Waypoint, 'id'> {
  return {
    name: `Rest stop (~${stop.milesIntoLeg.toFixed(0)} mi)`,
    address: '',
    lat: stop.lat,
    lng: stop.lng,
    notes: 'Auto-suggested rest stop',
  };
}

export interface WaypointInsertion {
  index: number;
  waypoint: Omit<Waypoint, 'id'>;
}

// Turns every currently-suggested stop into an ordered list of (index, waypoint)
// insertions that can be applied via insertWaypointAt() one at a time, left to
// right, and land in the correct geographic order. Two or more stops can share
// the same original legIndex (a single long leg split into several pieces), so
// each insertion after the first needs its target index bumped by however many
// insertions already happened — otherwise a later-in-leg stop would get spliced
// in BEFORE an earlier one instead of after it.
export function planSuggestedStopInsertions(
  legs: RouteLeg[],
  intervalHours: number,
  intervalMiles: number,
): WaypointInsertion[] {
  const stops = computeSuggestedStops(legs, intervalHours, intervalMiles);
  let insertedSoFar = 0;
  return stops.map((stop) => {
    const index = stop.legIndex + 1 + insertedSoFar;
    insertedSoFar += 1;
    return { index, waypoint: suggestedStopToWaypoint(stop) };
  });
}
