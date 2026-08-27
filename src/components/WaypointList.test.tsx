import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaypointList from './WaypointList';
import { useTripStore } from '../store/tripStore';

// @dnd-kit's sortable hooks reference ResizeObserver; it doesn't need real
// measurements for a static render/click test with no drag simulated.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const initialState = useTripStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTripStore.setState(initialState, true);
});

describe('WaypointList', () => {
  it('renders one numbered item per waypoint, in order', () => {
    render(<WaypointList />);
    const names = useTripStore.getState().waypoints.map((w) => w.name);
    names.forEach((name) => expect(screen.getByText(name)).toBeInTheDocument());
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('typing in the notes input updates that waypoint in the store', async () => {
    const user = userEvent.setup();
    render(<WaypointList />);
    const target = useTripStore.getState().waypoints[0];
    const [firstNotesInput] = screen.getAllByPlaceholderText(/Notes/);
    await user.type(firstNotesInput, 'fuel stop');
    expect(useTripStore.getState().waypoints.find((w) => w.id === target.id)?.notes).toContain('fuel stop');
  });

  it('clicking remove removes that waypoint (and only that one) from the store', async () => {
    const user = userEvent.setup();
    render(<WaypointList />);
    const target = useTripStore.getState().waypoints[0];
    await user.click(screen.getByLabelText(`Remove ${target.name}`));

    const remaining = useTripStore.getState().waypoints;
    expect(remaining).toHaveLength(3);
    expect(remaining.find((w) => w.id === target.id)).toBeUndefined();
  });
});
