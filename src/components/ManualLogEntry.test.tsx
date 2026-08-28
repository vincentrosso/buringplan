import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManualLogEntry from './ManualLogEntry';
import { newTripId, saveDaySummary } from '../store/tripLog';

vi.mock('../store/tripLog', () => ({
  newTripId: vi.fn(() => 'trip-1'),
  saveDaySummary: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.mocked(saveDaySummary).mockClear();
  vi.mocked(newTripId).mockClear();
});

describe('ManualLogEntry', () => {
  it('starts collapsed, showing only the toggle', () => {
    render(<ManualLogEntry onSaved={vi.fn()} />);
    expect(screen.getByText('+ Add manual entry')).toBeInTheDocument();
    expect(screen.queryByText('Save entry')).not.toBeInTheDocument();
  });

  it('opens the form when the toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<ManualLogEntry onSaved={vi.fn()} />);
    await user.click(screen.getByText('+ Add manual entry'));
    expect(screen.getByText('Save entry')).toBeInTheDocument();
  });

  it('cancel closes the form without saving', async () => {
    const user = userEvent.setup();
    render(<ManualLogEntry onSaved={vi.fn()} />);
    await user.click(screen.getByText('+ Add manual entry'));
    await user.click(screen.getByText('Cancel'));
    expect(screen.getByText('+ Add manual entry')).toBeInTheDocument();
    expect(saveDaySummary).not.toHaveBeenCalled();
  });

  it('derives avg speed from distance/duration, saves, calls onSaved, and collapses', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<ManualLogEntry onSaved={onSaved} />);
    await user.click(screen.getByText('+ Add manual entry'));

    await user.type(screen.getByLabelText('Label'), 'Apple Valley -> Denver');
    await user.type(screen.getByLabelText('Distance (mi)'), '120');
    await user.type(screen.getByLabelText('Max speed (mph)'), '70');
    await user.type(screen.getByLabelText('Duration (h)'), '2');
    await user.type(screen.getByLabelText('Duration (m)'), '30');

    await user.click(screen.getByText('Save entry'));

    expect(saveDaySummary).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(saveDaySummary).mock.calls[0][0];
    expect(saved.tripId).toBe('trip-1');
    expect(saved.label).toBe('Apple Valley -> Denver');
    expect(saved.distanceMiles).toBe(120);
    expect(saved.maxSpeedMph).toBe(70);
    expect(saved.durationSeconds).toBe(2 * 3600 + 30 * 60);
    expect(saved.avgSpeedMph).toBeCloseTo(48); // 120 mi / 2.5 h
    expect(saved.endTime - saved.startTime).toBe(saved.durationSeconds * 1000);

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(screen.getByText('+ Add manual entry')).toBeInTheDocument();
  });

  it('treats blank optional fields as zero and omits an empty label', async () => {
    const user = userEvent.setup();
    render(<ManualLogEntry onSaved={vi.fn()} />);
    await user.click(screen.getByText('+ Add manual entry'));
    await user.type(screen.getByLabelText('Distance (mi)'), '10');
    await user.click(screen.getByText('Save entry'));

    const saved = vi.mocked(saveDaySummary).mock.calls[0][0];
    expect(saved.avgSpeedMph).toBe(0);
    expect(saved.maxSpeedMph).toBe(0);
    expect(saved.durationSeconds).toBe(0);
    expect(saved.label).toBeUndefined();
  });
});
