import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TripEntryForm from './TripEntryForm';

describe('TripEntryForm', () => {
  it('prefills from initial values and shows a derived avg speed', () => {
    render(
      <TripEntryForm
        initial={{
          label: 'Denver leg',
          startTime: new Date('2026-08-02T09:00:00').getTime(),
          distanceMiles: 200,
          maxSpeedMph: 72,
          durationSeconds: 4 * 3600,
        }}
        submitLabel="Save"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue('Denver leg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('200')).toBeInTheDocument();
    expect(screen.getByText(/Avg speed: 50 mph/)).toBeInTheDocument();
  });

  it('submits a trimmed label and computed values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TripEntryForm submitLabel="Save entry" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Label'), '  Gerlach push  ');
    await user.type(screen.getByLabelText('Distance (mi)'), '90');
    await user.type(screen.getByLabelText('Duration (h)'), '1');
    await user.type(screen.getByLabelText('Duration (m)'), '30');
    await user.click(screen.getByText('Save entry'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0][0];
    expect(values.label).toBe('Gerlach push');
    expect(values.distanceMiles).toBe(90);
    expect(values.durationSeconds).toBe(5400);
    expect(values.avgSpeedMph).toBeCloseTo(60);
    expect(values.maxSpeedMph).toBe(0);
  });

  it('reports a zero avg speed when duration is blank', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TripEntryForm submitLabel="Save" onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText('Distance (mi)'), '40');
    await user.click(screen.getByText('Save'));
    expect(onSubmit.mock.calls[0][0].avgSpeedMph).toBe(0);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<TripEntryForm submitLabel="Save" onSubmit={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
