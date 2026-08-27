import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ParkingPage from './ParkingPage';
import { searchCampgroundsNearby, searchWalmartNearby } from '../lib/places';
import { useTripStore } from '../store/tripStore';

vi.mock('../lib/places', () => ({
  searchCampgroundsNearby: vi.fn().mockResolvedValue([]),
  searchWalmartNearby: vi.fn().mockResolvedValue([]),
}));

const initialState = useTripStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTripStore.setState(initialState, true);
});

describe('ParkingPage', () => {
  it('renders the parking search controls', () => {
    render(<ParkingPage />);
    expect(screen.getByText(/Search campgrounds/)).toBeInTheDocument();
  });
});
