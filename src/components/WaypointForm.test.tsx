import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaypointForm from './WaypointForm';
import { useTripStore } from '../store/tripStore';
import type { ReactNode } from 'react';

interface FakePlace {
  name?: string;
  formatted_address?: string;
  geometry?: { location: { lat: () => number; lng: () => number } };
}

let fakeAutocomplete = { getPlace: (): FakePlace | null => null };
let capturedOnPlaceChanged: (() => void) | null = null;

vi.mock('@react-google-maps/api', () => ({
  Autocomplete: (props: {
    children?: ReactNode;
    onLoad?: (a: typeof fakeAutocomplete) => void;
    onPlaceChanged?: () => void;
  }) => {
    props.onLoad?.(fakeAutocomplete);
    capturedOnPlaceChanged = props.onPlaceChanged ?? null;
    return props.children ?? null;
  },
}));

const initialState = useTripStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTripStore.setState(initialState, true);
  fakeAutocomplete = { getPlace: () => null };
  capturedOnPlaceChanged = null;
});

describe('WaypointForm', () => {
  it('renders a text input for adding a stop', () => {
    render(<WaypointForm />);
    expect(screen.getByPlaceholderText(/Add a stop/)).toBeInTheDocument();
  });

  it('does nothing if the selected place has no geometry/location', () => {
    render(<WaypointForm />);
    fakeAutocomplete.getPlace = () => ({ name: 'No Location' });
    act(() => capturedOnPlaceChanged?.());
    expect(useTripStore.getState().waypoints).toHaveLength(4);
  });

  it('adds a waypoint from the selected place and clears the input', async () => {
    const user = userEvent.setup();
    render(<WaypointForm />);
    const input = screen.getByPlaceholderText(/Add a stop/) as HTMLInputElement;
    await user.type(input, 'Rawlins');

    fakeAutocomplete.getPlace = () => ({
      name: 'Rawlins, WY',
      formatted_address: 'Rawlins, WY, USA',
      geometry: { location: { lat: () => 41.79, lng: () => -107.24 } },
    });
    act(() => capturedOnPlaceChanged?.());

    const waypoints = useTripStore.getState().waypoints;
    expect(waypoints).toHaveLength(5);
    expect(waypoints[4]).toMatchObject({
      name: 'Rawlins, WY',
      address: 'Rawlins, WY, USA',
      lat: 41.79,
      lng: -107.24,
    });
    expect(input.value).toBe('');
  });

  it('falls back to formatted_address as the name when the place has no name', () => {
    render(<WaypointForm />);
    fakeAutocomplete.getPlace = () => ({
      formatted_address: '123 Main St',
      geometry: { location: { lat: () => 1, lng: () => 2 } },
    });
    act(() => capturedOnPlaceChanged?.());
    expect(useTripStore.getState().waypoints[4].name).toBe('123 Main St');
  });

  it('falls back to "Untitled stop" / blank address when the place has neither name nor address', () => {
    render(<WaypointForm />);
    fakeAutocomplete.getPlace = () => ({
      geometry: { location: { lat: () => 1, lng: () => 2 } },
    });
    act(() => capturedOnPlaceChanged?.());
    const added = useTripStore.getState().waypoints[4];
    expect(added.name).toBe('Untitled stop');
    expect(added.address).toBe('');
  });
});
