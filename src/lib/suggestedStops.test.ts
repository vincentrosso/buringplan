import { describe, expect, it } from 'vitest';
import { computeSuggestedStops, planSuggestedStopInsertions } from './suggestedStops';
import type { RouteLeg } from '../types';

const METERS_PER_MILE = 1609.344;

function makeLeg(fromId: string, toId: string, stepMiles: number[], mphPerStep = 60): RouteLeg {
  const steps = stepMiles.map((miles, i) => ({
    lat: i,
    lng: i,
    distanceMeters: miles * METERS_PER_MILE,
    durationSeconds: (miles / mphPerStep) * 3600,
  }));
  const distanceMeters = steps.reduce((sum, s) => sum + s.distanceMeters, 0);
  const durationSeconds = steps.reduce((sum, s) => sum + s.durationSeconds, 0);
  return { fromId, toId, distanceMeters, durationSeconds, polyline: '', steps };
}

describe('computeSuggestedStops', () => {
  it('returns nothing for a leg shorter than both thresholds', () => {
    const legs = [makeLeg('a', 'b', [50, 50])]; // 100mi, well under a 200mi/6hr interval
    expect(computeSuggestedStops(legs, 6, 200)).toEqual([]);
  });

  it('places a stop once the mile threshold is crossed', () => {
    const legs = [makeLeg('a', 'b', [100, 100, 100])]; // 300mi total
    const stops = computeSuggestedStops(legs, 24 /* hours: won't trigger */, 200);
    expect(stops).toHaveLength(1);
    expect(stops[0].milesIntoLeg).toBeCloseTo(200, 5);
    expect(stops[0].legIndex).toBe(0);
  });

  it('places a stop once the hour threshold is crossed, even under the mile threshold', () => {
    // 6 steps of 30mi @ 30mph = 1hr/step; 6 steps lands exactly on the 6-hour cap.
    const legs = [makeLeg('a', 'b', [30, 30, 30, 30, 30, 30], 30)];
    const stops = computeSuggestedStops(legs, 6, 1000 /* miles: won't trigger */);
    expect(stops).toHaveLength(1);
    expect(stops[0].hoursIntoLeg).toBeCloseTo(6, 5);
    expect(stops[0].milesIntoLeg).toBeCloseTo(180, 5);
  });

  it('resets the budget at every named-waypoint leg boundary', () => {
    // Two 150mi legs: neither alone crosses 200mi, so no stops should appear,
    // even though the combined trip is 300mi.
    const legs = [makeLeg('a', 'b', [150]), makeLeg('b', 'c', [150])];
    expect(computeSuggestedStops(legs, 24, 200)).toEqual([]);
  });

  it('can emit multiple stops within one very long leg, reporting cumulative position in the leg', () => {
    // A trailing partial segment (150mi) keeps the leg from landing exactly on a
    // threshold multiple, so it shouldn't itself trigger an extra stop.
    const legs = [makeLeg('a', 'b', [200, 200, 200, 150])]; // 750mi
    const stops = computeSuggestedStops(legs, 24, 200);
    expect(stops).toHaveLength(3);
    // milesIntoLeg is cumulative position within the whole leg, not distance-since-last-stop.
    expect(stops.map((s) => Math.round(s.milesIntoLeg))).toEqual([200, 400, 600]);
  });

  it('returns nothing when there are no legs', () => {
    expect(computeSuggestedStops([], 6, 200)).toEqual([]);
  });

  it('returns nothing when both intervals are disabled (<=0)', () => {
    const legs = [makeLeg('a', 'b', [500])];
    expect(computeSuggestedStops(legs, 0, 0)).toEqual([]);
  });
});

describe('planSuggestedStopInsertions', () => {
  it('returns an empty plan when nothing needs splitting', () => {
    const legs = [makeLeg('a', 'b', [50])];
    expect(planSuggestedStopInsertions(legs, 6, 200)).toEqual([]);
  });

  it('targets legIndex + 1 for a single stop in a single leg', () => {
    const legs = [makeLeg('a', 'b', [100, 100, 100])]; // 300mi -> one stop at 200mi
    const plan = planSuggestedStopInsertions(legs, 24, 200);
    expect(plan).toHaveLength(1);
    expect(plan[0].index).toBe(1);
    expect(plan[0].waypoint.name).toContain('200');
  });

  it('increments the target index for each additional stop within the same leg, in geographic order', () => {
    // 750mi single leg at a 200mi interval -> 3 stops, all originally legIndex 0.
    const legs = [makeLeg('a', 'b', [200, 200, 200, 150])];
    const plan = planSuggestedStopInsertions(legs, 24, 200);
    expect(plan.map((p) => p.index)).toEqual([1, 2, 3]);
    // Applying insertWaypointAt at these indices in order lands them in mile order.
    const waypoints = ['W0', 'W1'];
    for (const { index, waypoint } of plan) waypoints.splice(index, 0, waypoint.name);
    expect(waypoints).toEqual(['W0', 'Rest stop (~200 mi)', 'Rest stop (~400 mi)', 'Rest stop (~600 mi)', 'W1']);
  });

  it('offsets later legs by however many stops were inserted into earlier legs', () => {
    // leg0 (a->b): 750mi, needs 3 stops. leg1 (b->c): 300mi, needs 1 stop.
    const legs = [makeLeg('a', 'b', [200, 200, 200, 150]), makeLeg('b', 'c', [100, 100, 100])];
    const plan = planSuggestedStopInsertions(legs, 24, 200);
    expect(plan.map((p) => p.index)).toEqual([1, 2, 3, 5]);

    const waypoints = ['W0', 'W1', 'W2'];
    for (const { index, waypoint } of plan) waypoints.splice(index, 0, waypoint.name);
    expect(waypoints[4]).toBe('W1'); // original b, pushed right by the 3 leg-0 insertions
    expect(waypoints[5]).toBe('Rest stop (~200 mi)'); // the leg-1 stop, correctly after W1
    expect(waypoints[6]).toBe('W2');
  });
});
