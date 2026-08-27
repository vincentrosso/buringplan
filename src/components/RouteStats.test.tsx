import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RouteStats from './RouteStats';
import { clearLegCache, fetchRouteLegs } from '../lib/directions';
import { useTripStore } from '../store/tripStore';
import type { RouteLeg } from '../types';

vi.mock('../lib/directions', () => ({
  fetchRouteLegs: vi.fn(),
  clearLegCache: vi.fn(),
}));

const initialState = useTripStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTripStore.setState(initialState, true);
  vi.mocked(fetchRouteLegs).mockReset();
  vi.mocked(clearLegCache).mockClear();
});

const LEGS: RouteLeg[] = [
  { fromId: 'a', toId: 'b', distanceMeters: 160934, durationSeconds: 3600, polyline: '', steps: [] }, // ~100mi/1h
  { fromId: 'b', toId: 'c', distanceMeters: 321868, durationSeconds: 7200, polyline: '', steps: [] }, // ~200mi/2h
];

describe('RouteStats', () => {
  it('prompts for more stops when fewer than two waypoints exist', () => {
    useTripStore.setState({ waypoints: [useTripStore.getState().waypoints[0]] });
    render(<RouteStats />);
    expect(screen.getByText(/Add at least two stops/)).toBeInTheDocument();
    expect(fetchRouteLegs).not.toHaveBeenCalled();
  });

  it('renders total and per-leg distance/duration once legs load, and reports them via onLegsLoaded', async () => {
    vi.mocked(fetchRouteLegs).mockResolvedValue(LEGS);
    const onLegsLoaded = vi.fn();
    render(<RouteStats onLegsLoaded={onLegsLoaded} />);

    expect(await screen.findByText(/300 mi/)).toBeInTheDocument();
    expect(screen.getByText(/Leg 1: 100 mi/)).toBeInTheDocument();
    expect(screen.getByText(/Leg 2: 200 mi/)).toBeInTheDocument();
    expect(screen.getByText(/no truck\/trailer/)).toBeInTheDocument();
    await waitFor(() => expect(onLegsLoaded).toHaveBeenCalledWith(LEGS));
  });

  it('shows an error message if the route fails to load', async () => {
    vi.mocked(fetchRouteLegs).mockRejectedValue(new Error('quota exceeded'));
    render(<RouteStats />);
    expect(await screen.findByText(/Couldn't calculate the route/)).toBeInTheDocument();
  });

  it('does not clear the leg cache on a normal fetch (recalcSignal unset)', async () => {
    vi.mocked(fetchRouteLegs).mockResolvedValue(LEGS);
    render(<RouteStats />);
    await screen.findByText(/300 mi/);
    expect(clearLegCache).not.toHaveBeenCalled();
  });

  it('clears the leg cache and re-fetches when recalcSignal increases', async () => {
    vi.mocked(fetchRouteLegs).mockResolvedValue(LEGS);
    const { rerender } = render(<RouteStats recalcSignal={0} />);
    await screen.findByText(/300 mi/);
    expect(fetchRouteLegs).toHaveBeenCalledTimes(1);

    rerender(<RouteStats recalcSignal={1} />);
    await waitFor(() => expect(fetchRouteLegs).toHaveBeenCalledTimes(2));
    expect(clearLegCache).toHaveBeenCalledTimes(1);
  });
});
