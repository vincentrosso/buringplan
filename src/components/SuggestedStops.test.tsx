import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import SuggestedStops from './SuggestedStops';
import { useTripStore } from '../store/tripStore';
import type { SuggestedStop } from '../types';

const initialState = useTripStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTripStore.setState(initialState, true);
});

const STOP: SuggestedStop = {
  id: 'stop-0-0',
  lat: 41,
  lng: -100,
  legIndex: 1,
  milesIntoLeg: 200,
  hoursIntoLeg: 3.2,
};

describe('SuggestedStops', () => {
  it('prompts to add stops when there are no legs yet', () => {
    render(<SuggestedStops stops={[]} hasLegs={false} />);
    expect(screen.getByText(/Add at least two stops/)).toBeInTheDocument();
  });

  it('says no stop is needed when legs exist but nothing crosses the interval', () => {
    render(<SuggestedStops stops={[]} hasLegs />);
    expect(screen.getByText(/No leg is long enough/)).toBeInTheDocument();
  });

  it('renders the interval controls seeded from the store defaults', () => {
    render(<SuggestedStops stops={[]} hasLegs={false} />);
    expect(screen.getByDisplayValue('6')).toBeInTheDocument();
    expect(screen.getByDisplayValue('200')).toBeInTheDocument();
  });

  it('changing the hour/mile inputs updates the persisted store', async () => {
    const user = userEvent.setup();
    render(<SuggestedStops stops={[]} hasLegs={false} />);

    const hoursInput = screen.getByDisplayValue('6');
    await user.clear(hoursInput);
    await user.type(hoursInput, '4');
    expect(useTripStore.getState().stopIntervalHours).toBe(4);

    const milesInput = screen.getByDisplayValue('200');
    await user.clear(milesInput);
    await user.type(milesInput, '150');
    expect(useTripStore.getState().stopIntervalMiles).toBe(150);
  });

  it('lists suggested stops and inserts one as a waypoint at the correct index', async () => {
    const user = userEvent.setup();
    render(<SuggestedStops stops={[STOP]} hasLegs />);

    expect(screen.getByText(/Stop 1: ~200 mi \/ 3\.2 hrs into that leg/)).toBeInTheDocument();

    await user.click(screen.getByText('Add as waypoint'));

    const waypoints = useTripStore.getState().waypoints;
    // legIndex 1 means the stop falls within the leg from waypoints[1] to waypoints[2],
    // so it should be inserted at index 2.
    expect(waypoints[2].name).toContain('Rest stop');
    expect(waypoints[2].lat).toBe(41);
    expect(waypoints[2].lng).toBe(-100);
    expect(waypoints).toHaveLength(5); // 4 seeded + 1 inserted
  });
});
