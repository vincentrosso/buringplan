import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TripDataTransfer from './TripDataTransfer';
import { exportTripSnapshot, importTripSnapshot } from '../lib/tripSnapshot';
import type { TripSnapshot } from '../lib/tripSnapshot';

vi.mock('../lib/tripSnapshot', () => ({
  exportTripSnapshot: vi.fn(),
  importTripSnapshot: vi.fn(),
}));

function snapshot(over: Partial<TripSnapshot> = {}): TripSnapshot {
  return {
    app: 'buringplan',
    version: 1,
    exportedAt: '',
    waypoints: [],
    parkingSpots: [],
    stopIntervalHours: 6,
    stopIntervalMiles: 200,
    daySummaries: [],
    ...over,
  };
}

beforeEach(() => {
  vi.mocked(exportTripSnapshot).mockReset().mockResolvedValue('{"app":"buringplan","version":1}');
  vi.mocked(importTripSnapshot).mockReset();
});

describe('TripDataTransfer', () => {
  it('reveals the exported text when Export is clicked', async () => {
    const user = userEvent.setup();
    render(<TripDataTransfer />);
    await user.click(screen.getByText('Export trip data'));
    expect(await screen.findByDisplayValue('{"app":"buringplan","version":1}')).toBeInTheDocument();
  });

  it('copies the exported text to the clipboard', async () => {
    const user = userEvent.setup();
    // userEvent.setup() installs its own navigator.clipboard stub; spy on that.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<TripDataTransfer />);
    await user.click(screen.getByText('Export trip data'));
    await user.click(screen.getByText('Copy'));
    expect(writeText).toHaveBeenCalledWith('{"app":"buringplan","version":1}');
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('disables Load until text is pasted, then imports and reports counts', async () => {
    vi.mocked(importTripSnapshot).mockResolvedValue(
      snapshot({
        waypoints: [{ id: 'a' }, { id: 'b' }] as never,
        parkingSpots: [{ id: 'p' }] as never,
      }),
    );
    const onImported = vi.fn();
    const user = userEvent.setup();
    render(<TripDataTransfer onImported={onImported} />);

    await user.click(screen.getByText('Import trip data'));
    expect(screen.getByText('Load trip data')).toBeDisabled();

    await user.type(screen.getByLabelText('Trip data to import'), 'some pasted text');
    await user.click(screen.getByText('Load trip data'));

    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1));
    expect(importTripSnapshot).toHaveBeenCalledWith('some pasted text');
    expect(
      screen.getByText('Loaded 2 stops, 1 parking spots, 0 trip-log entries.'),
    ).toBeInTheDocument();
  });

  it('surfaces an import error and stays on the import panel', async () => {
    vi.mocked(importTripSnapshot).mockRejectedValue(new Error("This isn't a buringplan export."));
    const user = userEvent.setup();
    render(<TripDataTransfer />);
    await user.click(screen.getByText('Import trip data'));
    await user.type(screen.getByLabelText('Trip data to import'), 'garbage');
    await user.click(screen.getByText('Load trip data'));

    expect(await screen.findByText("This isn't a buringplan export.")).toBeInTheDocument();
    expect(screen.getByText('Load trip data')).toBeInTheDocument();
    expect(screen.queryByText('Export trip data')).not.toBeInTheDocument();
  });

  it('Cancel closes the import panel without importing', async () => {
    const user = userEvent.setup();
    render(<TripDataTransfer />);
    await user.click(screen.getByText('Import trip data'));
    await user.click(screen.getByText('Cancel'));
    expect(screen.getByText('Export trip data')).toBeInTheDocument();
    expect(importTripSnapshot).not.toHaveBeenCalled();
  });
});
