import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlanPage from './PlanPage';
import { fetchRouteLegs } from '../lib/directions';
import { useTripStore } from '../store/tripStore';

vi.mock('../lib/directions', () => ({
  fetchRouteLegs: vi.fn().mockResolvedValue([]),
  clearLegCache: vi.fn(),
}));

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
});
