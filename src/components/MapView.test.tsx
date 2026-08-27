import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MapView from './MapView';
import type { ParkingSpot, RouteLeg, SuggestedStop, Waypoint } from '../types';

const decodePathMock = vi.fn(() => [{ lat: 0, lng: 0 }]);

beforeEach(() => {
  decodePathMock.mockClear();
  (globalThis as unknown as { google: unknown }).google = {
    maps: { geometry: { encoding: { decodePath: decodePathMock } } },
  };
});

const WAYPOINTS: Waypoint[] = [
  { id: 'a', name: 'A', address: '', lat: 1, lng: 2, notes: '' },
  { id: 'b', name: 'B', address: '', lat: 3, lng: 4, notes: '' },
];

describe('MapView', () => {
  it('renders without crashing given a full set of props', () => {
    const parkingSpots: ParkingSpot[] = [
      {
        id: 'p1',
        waypointId: 'a',
        placeId: 'g1',
        name: 'Camp',
        address: '',
        category: 'campground',
        lat: 1,
        lng: 1,
        notes: '',
      },
      {
        id: 'p2',
        waypointId: 'a',
        placeId: 'g2',
        name: 'WM',
        address: '',
        category: 'walmart',
        lat: 2,
        lng: 2,
        notes: '',
      },
    ];
    const suggestedStops: SuggestedStop[] = [
      { id: 's1', lat: 5, lng: 6, legIndex: 0, milesIntoLeg: 100, hoursIntoLeg: 2 },
    ];
    const routeLegs: RouteLeg[] = [
      { fromId: 'a', toId: 'b', distanceMeters: 1000, durationSeconds: 60, polyline: 'abc', steps: [] },
      { fromId: 'b', toId: 'c', distanceMeters: 1000, durationSeconds: 60, polyline: '', steps: [] },
    ];

    expect(() =>
      render(
        <MapView
          waypoints={WAYPOINTS}
          parkingSpots={parkingSpots}
          suggestedStops={suggestedStops}
          routeLegs={routeLegs}
          currentPosition={{ lat: 9, lng: 9 }}
        />,
      ),
    ).not.toThrow();
  });

  it('decodes the polyline for legs that have one, and skips legs without one', () => {
    const routeLegs: RouteLeg[] = [
      { fromId: 'a', toId: 'b', distanceMeters: 1000, durationSeconds: 60, polyline: 'has-polyline', steps: [] },
      { fromId: 'b', toId: 'c', distanceMeters: 1000, durationSeconds: 60, polyline: '', steps: [] },
    ];
    render(<MapView waypoints={WAYPOINTS} routeLegs={routeLegs} />);
    expect(decodePathMock).toHaveBeenCalledTimes(1);
    expect(decodePathMock).toHaveBeenCalledWith('has-polyline');
  });

  it('renders with only the required waypoints prop (all optional collections empty)', () => {
    expect(() => render(<MapView waypoints={[]} />)).not.toThrow();
    expect(decodePathMock).not.toHaveBeenCalled();
  });

  it('falls back gracefully when google.maps.geometry is unavailable', () => {
    (globalThis as unknown as { google: unknown }).google = undefined;
    const routeLegs: RouteLeg[] = [
      { fromId: 'a', toId: 'b', distanceMeters: 1000, durationSeconds: 60, polyline: 'abc', steps: [] },
    ];
    expect(() => render(<MapView waypoints={WAYPOINTS} routeLegs={routeLegs} />)).not.toThrow();
  });
});
