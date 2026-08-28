import { beforeEach, describe, expect, it } from 'vitest';
import {
  SNAPSHOT_VERSION,
  exportTripSnapshot,
  importTripSnapshot,
  parseTripSnapshot,
} from './tripSnapshot';
import { getAllDaySummaries, replaceAllDaySummaries, saveDaySummary } from '../store/tripLog';
import { useTripStore } from '../store/tripStore';
import type { DaySummary } from '../types';

const initialState = useTripStore.getState();

const SUMMARY: DaySummary = {
  tripId: 'trip-a',
  label: 'Leg one',
  startTime: 1_000_000,
  endTime: 1_000_000 + 3_600_000,
  distanceMiles: 60,
  avgSpeedMph: 60,
  maxSpeedMph: 70,
  durationSeconds: 3600,
};

beforeEach(async () => {
  localStorage.clear();
  useTripStore.setState(initialState, true);
  await replaceAllDaySummaries([]);
});

describe('exportTripSnapshot', () => {
  it('serializes plan state and the trip log as pretty-printed JSON', async () => {
    await saveDaySummary(SUMMARY);
    const text = await exportTripSnapshot();
    expect(text).toContain('\n  '); // indented / pretty
    const parsed = JSON.parse(text);
    expect(parsed.app).toBe('buringplan');
    expect(parsed.version).toBe(SNAPSHOT_VERSION);
    expect(parsed.waypoints).toHaveLength(4); // seed trip
    expect(parsed.daySummaries).toHaveLength(1);
    expect(parsed.daySummaries[0].label).toBe('Leg one');
  });
});

describe('parseTripSnapshot', () => {
  it('rejects text that is not JSON', () => {
    expect(() => parseTripSnapshot('not json at all')).toThrow(/valid JSON/);
  });

  it('rejects a JSON array', () => {
    expect(() => parseTripSnapshot('[]')).toThrow(/JSON object/);
  });

  it('rejects a payload from another app', () => {
    expect(() => parseTripSnapshot('{"app":"something-else"}')).toThrow(/buringplan export/);
  });

  it('rejects an unsupported version', () => {
    expect(() => parseTripSnapshot('{"app":"buringplan","version":999}')).toThrow(/version/);
  });

  it('rejects a waypoint missing coordinates', () => {
    const bad = JSON.stringify({
      app: 'buringplan',
      version: SNAPSHOT_VERSION,
      waypoints: [{ name: 'No coords' }],
    });
    expect(() => parseTripSnapshot(bad)).toThrow(/lat\/lng/);
  });

  it('fills missing intervals and coerces loose fields', () => {
    const snap = parseTripSnapshot(
      JSON.stringify({
        app: 'buringplan',
        version: SNAPSHOT_VERSION,
        waypoints: [{ id: 'w1', name: 'A', lat: 1, lng: 2 }],
        parkingSpots: [{ id: 'p1', lat: 3, lng: 4, category: 'bogus' }],
        daySummaries: [{ tripId: 't1', startTime: 5 }],
      }),
    );
    expect(snap.stopIntervalHours).toBe(6);
    expect(snap.stopIntervalMiles).toBe(200);
    expect(snap.waypoints[0].notes).toBe('');
    expect(snap.parkingSpots[0].category).toBe('other');
    expect(snap.daySummaries[0].distanceMiles).toBe(0);
  });
});

describe('importTripSnapshot', () => {
  it('round-trips an export back into the store and the trip log', async () => {
    useTripStore.getState().addWaypoint({ name: 'Extra', address: '', lat: 5, lng: 6, notes: '' });
    useTripStore.getState().setStopIntervalHours(4);
    await saveDaySummary(SUMMARY);
    const text = await exportTripSnapshot();

    useTripStore.getState().clearTrip();
    await replaceAllDaySummaries([]);
    expect(useTripStore.getState().waypoints).toEqual([]);

    const restored = await importTripSnapshot(text);
    expect(restored.waypoints).toHaveLength(5);
    expect(useTripStore.getState().waypoints).toHaveLength(5);
    expect(useTripStore.getState().stopIntervalHours).toBe(4);
    expect(await getAllDaySummaries()).toHaveLength(1);
  });

  it('replaces existing trip-log entries rather than merging', async () => {
    await saveDaySummary({ ...SUMMARY, tripId: 'old' });
    const text = JSON.stringify({
      app: 'buringplan',
      version: SNAPSHOT_VERSION,
      waypoints: [],
      parkingSpots: [],
      daySummaries: [{ ...SUMMARY, tripId: 'new' }],
    });
    await importTripSnapshot(text);
    expect((await getAllDaySummaries()).map((s) => s.tripId)).toEqual(['new']);
  });
});
