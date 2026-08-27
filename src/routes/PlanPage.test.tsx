import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlanPage from './PlanPage';
import { fetchRouteLegs } from '../lib/directions';
import { useTripStore } from '../store/tripStore';

vi.mock('../lib/directions', () => ({
  fetchRouteLegs: vi.fn().mockResolvedValue([]),
}));

const initialState = useTripStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTripStore.setState(initialState, true);
});

describe('PlanPage', () => {
  it('renders the waypoint list, route stats, and suggested stops sections', async () => {
    render(<PlanPage />);
    expect(screen.getByText('Stillwater, MN')).toBeInTheDocument();
    expect(await screen.findByText(/Suggested rest stops/)).toBeInTheDocument();
  });
});
