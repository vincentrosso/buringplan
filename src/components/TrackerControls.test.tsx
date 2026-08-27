import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TrackerControls from './TrackerControls';
import { addPing, saveDaySummary } from '../store/tripLog';

vi.mock('../store/tripLog', () => ({
  newTripId: vi.fn(() => 'trip-1'),
  addPing: vi.fn().mockResolvedValue(undefined),
  saveDaySummary: vi.fn().mockResolvedValue(undefined),
}));

type SuccessCb = (pos: GeolocationPosition) => void;
type ErrorCb = (err: GeolocationPositionError) => void;

function makePosition(lat: number, lng: number, timestamp: number, speed: number | null, accuracy = 5) {
  return {
    coords: { latitude: lat, longitude: lng, speed, heading: null, accuracy },
    timestamp,
  } as unknown as GeolocationPosition;
}

let watchPositionMock: ReturnType<typeof vi.fn>;
let clearWatchMock: ReturnType<typeof vi.fn>;
let successCb: SuccessCb;
let errorCb: ErrorCb;

beforeEach(() => {
  vi.mocked(addPing).mockClear();
  vi.mocked(saveDaySummary).mockClear();
  watchPositionMock = vi.fn((success: SuccessCb, error: ErrorCb) => {
    successCb = success;
    errorCb = error;
    return 1;
  });
  clearWatchMock = vi.fn();
  Object.defineProperty(navigator, 'geolocation', {
    value: { watchPosition: watchPositionMock, clearWatch: clearWatchMock },
    configurable: true,
  });
});

describe('TrackerControls', () => {
  it('shows an error if geolocation is unavailable', async () => {
    // @ts-expect-error deliberately removing it to simulate an unsupported browser
    delete navigator.geolocation;
    const user = userEvent.setup();
    render(<TrackerControls />);
    await user.click(screen.getByText('Start tracking'));
    expect(screen.getByText(/Geolocation is not available/)).toBeInTheDocument();
    expect(watchPositionMock).not.toHaveBeenCalled();
  });

  it('starts a watch and flips the button to Stop & save', async () => {
    const user = userEvent.setup();
    render(<TrackerControls />);
    await user.click(screen.getByText('Start tracking'));
    expect(watchPositionMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Stop & save')).toBeInTheDocument();
  });

  it('updates the live readouts as plausible position pings arrive', async () => {
    const user = userEvent.setup();
    const { container } = render(<TrackerControls />);
    await user.click(screen.getByText('Start tracking'));

    act(() => successCb(makePosition(45.0, -93.0, 1000, 20)));
    act(() => successCb(makePosition(45.01, -93.0, 61000, 30)));

    const values = container.querySelectorAll('.tracker-readout-value');
    expect(values[0].textContent).toBe('67'); // current speed, mpsToMph(30) ~= 67.1
    expect(Number(values[1].textContent)).toBeGreaterThan(0.5); // distance in miles
    expect(values[2].textContent).toBe('67'); // max speed
    expect(addPing).toHaveBeenCalledTimes(2);
  });

  it('ignores an implausible ping (a huge instantaneous jump)', async () => {
    const user = userEvent.setup();
    const { container } = render(<TrackerControls />);
    await user.click(screen.getByText('Start tracking'));

    act(() => successCb(makePosition(45.0, -93.0, 1000, 20)));
    act(() => successCb(makePosition(50.0, -93.0, 2000, 20))); // ~345 miles in one second

    expect(addPing).toHaveBeenCalledTimes(1); // the second ping was rejected
    const values = container.querySelectorAll('.tracker-readout-value');
    expect(Number(values[1].textContent)).toBe(0);
  });

  it('shows a geolocation error message from the browser', async () => {
    const user = userEvent.setup();
    render(<TrackerControls />);
    await user.click(screen.getByText('Start tracking'));
    act(() => errorCb({ message: 'User denied Geolocation', code: 1 } as GeolocationPositionError));
    expect(screen.getByText('User denied Geolocation')).toBeInTheDocument();
  });

  it('ticks the elapsed-time readout once a second while tracking', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<TrackerControls />);
    await user.click(screen.getByText('Start tracking'));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const values = container.querySelectorAll('.tracker-readout-value');
    expect(values[3].textContent).toBe('00:00:03');
    vi.useRealTimers();
  });

  it('stop & save clears the watch, saves a day summary, and calls onSessionSaved', async () => {
    const user = userEvent.setup();
    const onSessionSaved = vi.fn();
    render(<TrackerControls onSessionSaved={onSessionSaved} />);
    await user.click(screen.getByText('Start tracking'));

    act(() => successCb(makePosition(45.0, -93.0, 1000, 20)));
    act(() => successCb(makePosition(45.01, -93.0, 61000, 30)));

    await user.click(screen.getByText('Stop & save'));

    expect(clearWatchMock).toHaveBeenCalledWith(1);
    expect(saveDaySummary).toHaveBeenCalledTimes(1);
    const summary = vi.mocked(saveDaySummary).mock.calls[0][0];
    expect(summary.tripId).toBe('trip-1');
    expect(summary.maxSpeedMph).toBeCloseTo(67.1, 0);
    expect(onSessionSaved).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Start tracking')).toBeInTheDocument();
  });
});
