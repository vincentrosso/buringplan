import { beforeEach, describe, expect, it } from 'vitest';
import { useTripStore } from './tripStore';

const initialState = useTripStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTripStore.setState(initialState, true);
});

describe('tripStore waypoints', () => {
  it('seeds the trip with the four default stops in order', () => {
    const names = useTripStore.getState().waypoints.map((w) => w.name);
    expect(names).toEqual(['Stillwater, MN', 'Apple Valley, MN', 'Denver, CO', 'Gerlach, NV']);
  });

  it('addWaypoint appends to the end with a generated id', () => {
    useTripStore.getState().addWaypoint({
      name: 'New Stop',
      address: '',
      lat: 1,
      lng: 2,
      notes: '',
    });
    const waypoints = useTripStore.getState().waypoints;
    expect(waypoints).toHaveLength(5);
    expect(waypoints[4].name).toBe('New Stop');
    expect(waypoints[4].id).toBeTruthy();
  });

  it('insertWaypointAt inserts at the given index without disturbing order', () => {
    useTripStore.getState().insertWaypointAt(1, {
      name: 'Rest stop',
      address: '',
      lat: 1,
      lng: 2,
      notes: '',
    });
    const names = useTripStore.getState().waypoints.map((w) => w.name);
    expect(names).toEqual(['Stillwater, MN', 'Rest stop', 'Apple Valley, MN', 'Denver, CO', 'Gerlach, NV']);
  });

  it('removeWaypoint removes the waypoint and any parking spots anchored to it', () => {
    const target = useTripStore.getState().waypoints[0];
    useTripStore.getState().addParkingSpot({
      waypointId: target.id,
      placeId: 'p1',
      name: 'Campground',
      address: '',
      category: 'campground',
      lat: 0,
      lng: 0,
      notes: '',
    });

    useTripStore.getState().removeWaypoint(target.id);

    const state = useTripStore.getState();
    expect(state.waypoints.find((w) => w.id === target.id)).toBeUndefined();
    expect(state.parkingSpots.find((p) => p.waypointId === target.id)).toBeUndefined();
  });

  it('updateWaypoint patches only the given waypoint', () => {
    const target = useTripStore.getState().waypoints[0];
    useTripStore.getState().updateWaypoint(target.id, { notes: 'fuel stop' });
    const updated = useTripStore.getState().waypoints.find((w) => w.id === target.id);
    expect(updated?.notes).toBe('fuel stop');
    expect(updated?.name).toBe(target.name);
  });

  it('reorderWaypoints moves a waypoint from one index to another', () => {
    useTripStore.getState().reorderWaypoints(0, 2);
    const names = useTripStore.getState().waypoints.map((w) => w.name);
    expect(names).toEqual(['Apple Valley, MN', 'Denver, CO', 'Stillwater, MN', 'Gerlach, NV']);
  });
});

describe('tripStore parking spots', () => {
  it('addParkingSpot appends with a generated id', () => {
    useTripStore.getState().addParkingSpot({
      waypointId: 'w1',
      placeId: 'p1',
      name: 'Walmart',
      address: '',
      category: 'walmart',
      lat: 0,
      lng: 0,
      notes: '',
    });
    const spots = useTripStore.getState().parkingSpots;
    expect(spots).toHaveLength(1);
    expect(spots[0].id).toBeTruthy();
  });

  it('removeParkingSpot removes only the targeted spot', () => {
    useTripStore.getState().addParkingSpot({
      waypointId: 'w1',
      placeId: 'p1',
      name: 'A',
      address: '',
      category: 'campground',
      lat: 0,
      lng: 0,
      notes: '',
    });
    useTripStore.getState().addParkingSpot({
      waypointId: 'w1',
      placeId: 'p2',
      name: 'B',
      address: '',
      category: 'campground',
      lat: 0,
      lng: 0,
      notes: '',
    });
    const [first, second] = useTripStore.getState().parkingSpots;
    useTripStore.getState().removeParkingSpot(first.id);
    const remaining = useTripStore.getState().parkingSpots;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(second.id);
  });

  it('updateParkingSpotNotes updates only the targeted spot, leaving others untouched', () => {
    useTripStore.getState().addParkingSpot({
      waypointId: 'w1',
      placeId: 'p1',
      name: 'A',
      address: '',
      category: 'campground',
      lat: 0,
      lng: 0,
      notes: '',
    });
    useTripStore.getState().addParkingSpot({
      waypointId: 'w1',
      placeId: 'p2',
      name: 'B',
      address: '',
      category: 'campground',
      lat: 0,
      lng: 0,
      notes: 'original',
    });
    const [first, second] = useTripStore.getState().parkingSpots;
    useTripStore.getState().updateParkingSpotNotes(first.id, 'confirmed overnight OK');
    const spots = useTripStore.getState().parkingSpots;
    expect(spots.find((p) => p.id === first.id)?.notes).toBe('confirmed overnight OK');
    expect(spots.find((p) => p.id === second.id)?.notes).toBe('original');
  });
});

describe('tripStore stop interval settings', () => {
  it('defaults to 6 hours / 200 miles', () => {
    const state = useTripStore.getState();
    expect(state.stopIntervalHours).toBe(6);
    expect(state.stopIntervalMiles).toBe(200);
  });

  it('setStopIntervalHours and setStopIntervalMiles update independently', () => {
    useTripStore.getState().setStopIntervalHours(4);
    useTripStore.getState().setStopIntervalMiles(150);
    const state = useTripStore.getState();
    expect(state.stopIntervalHours).toBe(4);
    expect(state.stopIntervalMiles).toBe(150);
  });
});

describe('tripStore clearTrip', () => {
  it('empties both waypoints and parkingSpots, leaving interval settings untouched', () => {
    useTripStore.getState().addParkingSpot({
      waypointId: useTripStore.getState().waypoints[0].id,
      placeId: 'p1',
      name: 'A',
      address: '',
      category: 'campground',
      lat: 0,
      lng: 0,
      notes: '',
    });
    useTripStore.getState().setStopIntervalMiles(150);

    useTripStore.getState().clearTrip();

    const state = useTripStore.getState();
    expect(state.waypoints).toEqual([]);
    expect(state.parkingSpots).toEqual([]);
    expect(state.stopIntervalMiles).toBe(150);
  });
});
