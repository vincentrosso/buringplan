import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlanPage from './PlanPage';
import { fetchRouteLegs } from '../lib/directions';
import { useTripStore } from '../store/tripStore';
import type { RouteLeg } from '../types';

vi.mock('../lib/directions', () => ({
  fetchRouteLegs: vi.fn().mockResolvedValue([]),
  clearLegCache: vi.fn(),
}));

function makeLeg(miles: number): RouteLeg {
  const meters = miles * 1609.344;
  return {
    fromId: 'x',
    toId: 'y',
    distanceMeters: meters,
    durationSeconds: 3600,
    polyline: '',
    steps: [{ lat: 1, lng: 1, distanceMeters: meters, durationSeconds: 3600 }],
  };
}

const initialState = useTripStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTripStore.setState(initialState, true);
  vi.mocked(fetchRouteLegs).mockClear();
});

describe('PlanPage', () => {
  it('renders the waypoint list, route stats, and suggested stops sections', async () => {
    render(<PlanPage />);
    expect(screen.getByText('Stillwater, MN')).toBeInTheDocument();
    expect(await screen.findByText(/Suggested rest stops/)).toBeInTheDocument();
  });

  it('Recalc route triggers another route fetch', async () => {
    const user = userEvent.setup();
    render(<PlanPage />);
    await waitFor(() => expect(fetchRouteLegs).toHaveBeenCalledTimes(1));

    await user.click(screen.getByText('Recalc route'));
    await waitFor(() => expect(fetchRouteLegs).toHaveBeenCalledTimes(2));
  });

  it('Clear trip requires a confirm click, then empties the waypoint list', async () => {
    const user = userEvent.setup();
    render(<PlanPage />);

    await user.click(screen.getByText('Clear trip'));
    expect(screen.getByText('Stillwater, MN')).toBeInTheDocument(); // not cleared yet

    await user.click(screen.getByText('Confirm clear?'));
    expect(screen.queryByText('Stillwater, MN')).not.toBeInTheDocument();
    expect(useTripStore.getState().waypoints).toEqual([]);
  });

  it('Clear trip -> Cancel backs out without clearing', async () => {
    const user = userEvent.setup();
    render(<PlanPage />);

    await user.click(screen.getByText('Clear trip'));
    await user.click(screen.getByText('Cancel'));

    expect(screen.getByText('Stillwater, MN')).toBeInTheDocument();
    expect(useTripStore.getState().waypoints).toHaveLength(4);
  });

  it('Import trip data replaces the waypoints and kicks off a recalc', async () => {
    const user = userEvent.setup();
    render(<PlanPage />);
    await waitFor(() => expect(fetchRouteLegs).toHaveBeenCalledTimes(1));

    await user.click(screen.getByText('Import trip data'));
    await user.click(screen.getByLabelText('Trip data to import'));
    await user.paste(
      JSON.stringify({
        app: 'buringplan',
        version: 1,
        waypoints: [
          { id: 'z1', name: 'Zed One', lat: 1, lng: 2 },
          { id: 'z2', name: 'Zed Two', lat: 3, lng: 4 },
        ],
        parkingSpots: [],
        daySummaries: [],
      }),
    );
    await user.click(screen.getByText('Load trip data'));

    await waitFor(() => expect(screen.getByText('Zed One')).toBeInTheDocument());
    expect(screen.queryByText('Stillwater, MN')).not.toBeInTheDocument();
    await waitFor(() => expect(fetchRouteLegs.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('auto-inserts a suggested stop into the route on baseline load, no click needed', async () => {
    vi.mocked(fetchRouteLegs)
      .mockResolvedValueOnce([makeLeg(250)]) // baseline: one oversized leg
      .mockResolvedValue([makeLeg(50)]); // the re-fetch triggered by the insertion itself

    render(<PlanPage />);

    await waitFor(() =>
      expect(useTripStore.getState().waypoints.some((w) => w.name.startsWith('Rest stop'))).toBe(true),
    );
    expect(useTripStore.getState().waypoints).toHaveLength(5);
    expect(screen.getByText(/Rest stop/)).toBeInTheDocument();
  });

  it('auto-inserts again when Recalc finds a leg that still needs splitting', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchRouteLegs)
      .mockResolvedValueOnce([makeLeg(50)]) // baseline: nothing to split
      .mockResolvedValueOnce([makeLeg(250)]) // recalc: now needs a split
      .mockResolvedValue([makeLeg(50)]); // the re-fetch triggered by the insertion itself

    render(<PlanPage />);
    await waitFor(() => expect(fetchRouteLegs).toHaveBeenCalledTimes(1));
    expect(useTripStore.getState().waypoints.some((w) => w.name.startsWith('Rest stop'))).toBe(false);

    await user.click(screen.getByText('Recalc route'));

    await waitFor(() =>
      expect(useTripStore.getState().waypoints.some((w) => w.name.startsWith('Rest stop'))).toBe(true),
    );
  });

  it('does not auto-insert on a route change from something other than baseline load or Recalc', async () => {
    vi.mocked(fetchRouteLegs)
      .mockResolvedValueOnce([makeLeg(50)]) // baseline
      .mockResolvedValueOnce([makeLeg(250)]); // after a manual waypoint add

    render(<PlanPage />);
    await waitFor(() => expect(fetchRouteLegs).toHaveBeenCalledTimes(1));

    useTripStore.getState().addWaypoint({ name: 'New Stop', address: '', lat: 1, lng: 1, notes: '' });

    // Wait for the second fetch's result to actually render, proving handleLegsLoaded
    // ran to completion (including the skipped-insert branch), not just that the
    // fetch was called.
    expect(await screen.findByText(/Leg 1: 250 mi/)).toBeInTheDocument();
    expect(useTripStore.getState().waypoints.some((w) => w.name.startsWith('Rest stop'))).toBe(false);
  });
});
