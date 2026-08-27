import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLegCache, fetchLeg, fetchRouteLegs } from './directions';
import type { Waypoint } from '../types';

function makeWaypoint(id: string, lat: number, lng: number): Waypoint {
  return { id, name: id, address: '', lat, lng, notes: '' };
}

function makeLatLng(lat: number, lng: number) {
  return { lat: () => lat, lng: () => lng };
}

let routeMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearLegCache();
  routeMock = vi.fn().mockResolvedValue({
    routes: [
      {
        overview_polyline: 'encoded-polyline',
        legs: [
          {
            distance: { value: 321870 }, // ~200 miles
            duration: { value: 10800 }, // 3 hours
            steps: [
              { end_location: makeLatLng(1, 1), distance: { value: 160935 }, duration: { value: 5400 } },
              { end_location: makeLatLng(2, 2), distance: { value: 160935 }, duration: { value: 5400 } },
            ],
          },
        ],
      },
    ],
  });

  (globalThis as unknown as { google: unknown }).google = {
    maps: {
      // `new` requires a real constructor function — an arrow function throws
      // "is not a constructor", so this can't be `() => ({...})`.
      DirectionsService: vi.fn().mockImplementation(function DirectionsService(this: unknown) {
        return { route: routeMock };
      }),
      TravelMode: { DRIVING: 'DRIVING' },
    },
  };
});

describe('fetchLeg', () => {
  it('maps a DirectionsResult into a RouteLeg with step-level detail', async () => {
    const leg = await fetchLeg(makeWaypoint('a', 0, 0), makeWaypoint('b', 2, 2));

    expect(leg.fromId).toBe('a');
    expect(leg.toId).toBe('b');
    expect(leg.distanceMeters).toBe(321870);
    expect(leg.durationSeconds).toBe(10800);
    expect(leg.polyline).toBe('encoded-polyline');
    expect(leg.steps).toHaveLength(2);
    expect(leg.steps[0]).toEqual({ lat: 1, lng: 1, distanceMeters: 160935, durationSeconds: 5400 });
  });

  it('caches a leg so a second fetch does not re-call the Directions API', async () => {
    const from = makeWaypoint('a', 0, 0);
    const to = makeWaypoint('b', 2, 2);
    await fetchLeg(from, to);
    await fetchLeg(from, to);
    expect(routeMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to zero/empty defaults when the API omits optional fields', async () => {
    routeMock.mockResolvedValueOnce({
      routes: [{ legs: [{ steps: [{ end_location: makeLatLng(9, 9) }] }] }],
    });
    const leg = await fetchLeg(makeWaypoint('a', 0, 0), makeWaypoint('b', 2, 2));
    expect(leg.distanceMeters).toBe(0);
    expect(leg.durationSeconds).toBe(0);
    expect(leg.polyline).toBe('');
    expect(leg.steps[0]).toEqual({ lat: 9, lng: 9, distanceMeters: 0, durationSeconds: 0 });
  });

  it('defaults steps to an empty array when the API omits them entirely', async () => {
    routeMock.mockResolvedValueOnce({ routes: [{ legs: [{}] }] });
    const leg = await fetchLeg(makeWaypoint('a', 0, 0), makeWaypoint('b', 2, 2));
    expect(leg.steps).toEqual([]);
  });

  it('throws a descriptive error when no route is found', async () => {
    routeMock.mockResolvedValueOnce({ routes: [] });
    await expect(fetchLeg(makeWaypoint('a', 0, 0), makeWaypoint('c', 5, 5))).rejects.toThrow(
      /No route found between a and c/,
    );
  });
});

describe('fetchRouteLegs', () => {
  it('fetches one leg per consecutive waypoint pair, in order', async () => {
    const waypoints = [makeWaypoint('a', 0, 0), makeWaypoint('b', 1, 1), makeWaypoint('c', 2, 2)];
    const legs = await fetchRouteLegs(waypoints);
    expect(legs).toHaveLength(2);
    expect(legs[0].fromId).toBe('a');
    expect(legs[0].toId).toBe('b');
    expect(legs[1].fromId).toBe('b');
    expect(legs[1].toId).toBe('c');
  });

  it('returns an empty array for fewer than two waypoints', async () => {
    expect(await fetchRouteLegs([makeWaypoint('a', 0, 0)])).toEqual([]);
  });
});
