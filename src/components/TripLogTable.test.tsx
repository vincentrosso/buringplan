import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TripLogTable, { buildTripLogMailto } from './TripLogTable';
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

describe('buildTripLogMailto', () => {
  it('encodes a mailto with totals, labels, and per-session stats', () => {
    const href = buildTripLogMailto([{ ...SAMPLE, label: 'Leg one' }]);
    expect(href.startsWith('mailto:?subject=')).toBe(true);
    const body = decodeURIComponent(href.split('&body=')[1]);
    expect(body).toContain('1 session, 120 mi total');
    expect(body).toContain('Leg one');
    expect(body).toContain('120.0 mi');
    expect(body).toContain('max 75 mph');
  });
});

describe('TripLogTable', () => {
  it('shows an empty state and no email link when there are no tracked sessions', async () => {
    vi.mocked(getAllDaySummaries).mockResolvedValue([]);
    render(<TripLogTable refreshSignal={0} />);
    expect(await screen.findByText(/No tracked sessions yet/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Email log' })).not.toBeInTheDocument();
  });

  it('renders a card per summary, its label, and totals mileage in the header', async () => {
    vi.mocked(getAllDaySummaries).mockResolvedValue([{ ...SAMPLE, label: 'Apple Valley leg' }]);
    render(<TripLogTable refreshSignal={0} />);
    expect(await screen.findByText('120.0 mi')).toBeInTheDocument();
    expect(screen.getByText('Apple Valley leg')).toBeInTheDocument();
    expect(screen.getByText('Trip log (120 mi total)')).toBeInTheDocument();
  });

  it('offers an Email log link with a mailto href once there are sessions', async () => {
    render(<TripLogTable refreshSignal={0} />);
    const link = await screen.findByRole('link', { name: 'Email log' });
    expect(link.getAttribute('href')).toMatch(/^mailto:\?subject=/);
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
    const distanceInput = screen.getByDisplayValue('120');
    await user.clear(distanceInput);
    await user.type(distanceInput, '150');
    await user.click(screen.getByText('Save'));

    await waitFor(() => expect(updateDaySummary).toHaveBeenCalledTimes(1));
    const [tripId, patch] = vi.mocked(updateDaySummary).mock.calls[0];
    expect(tripId).toBe('trip-1');
    expect(patch.distanceMiles).toBe(150);
    expect(patch.avgSpeedMph).toBeCloseTo(75); // 150 mi / 2 h
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
