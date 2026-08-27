import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TripLogTable from './TripLogTable';
import { deleteDaySummary, getAllDaySummaries, updateDaySummary } from '../store/tripLog';
import type { DaySummary } from '../types';

vi.mock('../store/tripLog', () => ({
  getAllDaySummaries: vi.fn(),
  deleteDaySummary: vi.fn().mockResolvedValue(undefined),
  updateDaySummary: vi.fn().mockResolvedValue(undefined),
  newTripId: vi.fn(() => 'new-trip'),
  saveDaySummary: vi.fn().mockResolvedValue(undefined),
}));

const SAMPLE: DaySummary = {
  tripId: 'trip-1',
  startTime: new Date('2026-08-01T08:00:00').getTime(),
  endTime: new Date('2026-08-01T10:00:00').getTime(),
  distanceMiles: 120,
  avgSpeedMph: 60,
  maxSpeedMph: 75,
  durationSeconds: 7200,
};

beforeEach(() => {
  vi.mocked(getAllDaySummaries).mockReset().mockResolvedValue([SAMPLE]);
  vi.mocked(deleteDaySummary).mockClear();
  vi.mocked(updateDaySummary).mockClear();
});

describe('TripLogTable', () => {
  it('shows an empty state when there are no tracked sessions', async () => {
    vi.mocked(getAllDaySummaries).mockResolvedValue([]);
    render(<TripLogTable refreshSignal={0} />);
    expect(await screen.findByText(/No tracked sessions yet/)).toBeInTheDocument();
  });

  it('renders a row per summary and totals mileage in the header', async () => {
    render(<TripLogTable refreshSignal={0} />);
    expect(await screen.findByText('120.0 mi')).toBeInTheDocument();
    expect(screen.getByText('Trip log (120 mi total)')).toBeInTheDocument();
  });

  it('re-fetches when refreshSignal changes', async () => {
    const { rerender } = render(<TripLogTable refreshSignal={0} />);
    await screen.findByText('120.0 mi');
    expect(getAllDaySummaries).toHaveBeenCalledTimes(1);

    rerender(<TripLogTable refreshSignal={1} />);
    await waitFor(() => expect(getAllDaySummaries).toHaveBeenCalledTimes(2));
  });

  it('edit -> save calls updateDaySummary with the recomputed fields, then exits edit mode', async () => {
    const user = userEvent.setup();
    render(<TripLogTable refreshSignal={0} />);
    await screen.findByText('120.0 mi');

    await user.click(screen.getByText('Edit'));
    const distanceInput = screen.getByDisplayValue('120.0');
    await user.clear(distanceInput);
    await user.type(distanceInput, '150');
    await user.click(screen.getByText('Save'));

    await waitFor(() => expect(updateDaySummary).toHaveBeenCalledTimes(1));
    const [tripId, patch] = vi.mocked(updateDaySummary).mock.calls[0];
    expect(tripId).toBe('trip-1');
    expect(patch.distanceMiles).toBe(150);
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('edit -> cancel discards changes without saving', async () => {
    const user = userEvent.setup();
    render(<TripLogTable refreshSignal={0} />);
    await screen.findByText('120.0 mi');

    await user.click(screen.getByText('Edit'));
    await user.click(screen.getByText('Cancel'));

    expect(updateDaySummary).not.toHaveBeenCalled();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('delete requires a confirm click before calling deleteDaySummary', async () => {
    const user = userEvent.setup();
    render(<TripLogTable refreshSignal={0} />);
    await screen.findByText('120.0 mi');

    await user.click(screen.getByText('Delete'));
    expect(deleteDaySummary).not.toHaveBeenCalled();
    expect(screen.getByText('Confirm?')).toBeInTheDocument();

    await user.click(screen.getByText('Confirm?'));
    await waitFor(() => expect(deleteDaySummary).toHaveBeenCalledWith('trip-1'));
  });

  it('delete -> cancel backs out without deleting', async () => {
    const user = userEvent.setup();
    render(<TripLogTable refreshSignal={0} />);
    await screen.findByText('120.0 mi');

    await user.click(screen.getByText('Delete'));
    await user.click(screen.getByText('Cancel'));

    expect(deleteDaySummary).not.toHaveBeenCalled();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});
