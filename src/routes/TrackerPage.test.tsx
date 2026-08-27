import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TrackerPage from './TrackerPage';

vi.mock('../store/tripLog', () => ({
  newTripId: vi.fn(() => 'trip-1'),
  addPing: vi.fn().mockResolvedValue(undefined),
  saveDaySummary: vi.fn().mockResolvedValue(undefined),
  getAllDaySummaries: vi.fn().mockResolvedValue([]),
}));

describe('TrackerPage', () => {
  it('renders the tracker controls and trip log table', async () => {
    render(<TrackerPage />);
    expect(screen.getByText('Start tracking')).toBeInTheDocument();
    expect(await screen.findByText(/No tracked sessions yet/)).toBeInTheDocument();
  });
});
