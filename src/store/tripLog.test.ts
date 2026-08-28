import { describe, expect, it } from 'vitest';
import {
  addPing,
  deleteDaySummary,
  deletePingsForTrip,
  getAllDaySummaries,
  getPingsForTrip,
  newTripId,
  replaceAllDaySummaries,
  saveDaySummary,
  updateDaySummary,
} from './tripLog';
import type { DaySummary, GpsPing } from '../types';

function makeSummary(tripId: string, overrides: Partial<DaySummary> = {}): DaySummary {
  return {
    tripId,
    startTime: 1000,
    endTime: 2000,
    distanceMiles: 50,
    avgSpeedMph: 55,
    maxSpeedMph: 70,
    durationSeconds: 3600,
    ...overrides,
  };
}

function makePing(tripId: string, timestamp: number, overrides: Partial<GpsPing> = {}): GpsPing {
  return {
    tripId,
    lat: 1,
    lng: 2,
    speedMps: 10,
    heading: 90,
    accuracy: 5,
    timestamp,
    ...overrides,
  };
}

describe('newTripId', () => {
  it('generates unique ids', () => {
    expect(newTripId()).not.toBe(newTripId());
  });
});

describe('day summaries', () => {
  it('saveDaySummary + getAllDaySummaries round-trips a saved summary', async () => {
    const tripId = newTripId();
    await saveDaySummary(makeSummary(tripId));
    const all = await getAllDaySummaries();
    expect(all.find((s) => s.tripId === tripId)).toMatchObject({
      tripId,
      distanceMiles: 50,
      maxSpeedMph: 70,
    });
  });

  it('getAllDaySummaries sorts by startTime ascending', async () => {
    const idLater = newTripId();
    const idEarlier = newTripId();
    await saveDaySummary(makeSummary(idLater, { startTime: 5_000_000 }));
    await saveDaySummary(makeSummary(idEarlier, { startTime: 100 }));
    const all = await getAllDaySummaries();
    const earlierIndex = all.findIndex((s) => s.tripId === idEarlier);
    const laterIndex = all.findIndex((s) => s.tripId === idLater);
    expect(earlierIndex).toBeLessThan(laterIndex);
  });

  it('updateDaySummary merges a patch into the existing summary', async () => {
    const tripId = newTripId();
    await saveDaySummary(makeSummary(tripId));
    await updateDaySummary(tripId, { distanceMiles: 99 });
    const found = (await getAllDaySummaries()).find((s) => s.tripId === tripId);
    expect(found?.distanceMiles).toBe(99);
    expect(found?.maxSpeedMph).toBe(70); // untouched field survives the merge
  });

  it('updateDaySummary is a no-op for an unknown tripId', async () => {
    await expect(updateDaySummary('does-not-exist', { distanceMiles: 1 })).resolves.toBeUndefined();
  });

  it('replaceAllDaySummaries wipes existing summaries and pings, then writes the new set', async () => {
    const oldId = newTripId();
    await saveDaySummary(makeSummary(oldId));
    await addPing(makePing(oldId, 1000));

    const a = newTripId();
    const b = newTripId();
    await replaceAllDaySummaries([makeSummary(a, { distanceMiles: 11 }), makeSummary(b, { distanceMiles: 22 })]);

    const all = await getAllDaySummaries();
    expect(all.map((s) => s.tripId).sort()).toEqual([a, b].sort());
    expect(all.find((s) => s.tripId === oldId)).toBeUndefined();
    expect(await getPingsForTrip(oldId)).toEqual([]);
  });

  it('replaceAllDaySummaries with an empty list clears the log', async () => {
    await saveDaySummary(makeSummary(newTripId()));
    await replaceAllDaySummaries([]);
    expect(await getAllDaySummaries()).toEqual([]);
  });

  it('deleteDaySummary removes the summary and its associated pings', async () => {
    const tripId = newTripId();
    await saveDaySummary(makeSummary(tripId));
    await addPing(makePing(tripId, 1000));
    await addPing(makePing(tripId, 2000));

    await deleteDaySummary(tripId);

    expect((await getAllDaySummaries()).find((s) => s.tripId === tripId)).toBeUndefined();
    expect(await getPingsForTrip(tripId)).toEqual([]);
  });
});

describe('gps pings', () => {
  it('addPing + getPingsForTrip round-trips and sorts by timestamp', async () => {
    const tripId = newTripId();
    await addPing(makePing(tripId, 2000));
    await addPing(makePing(tripId, 1000));
    const pings = await getPingsForTrip(tripId);
    expect(pings.map((p) => p.timestamp)).toEqual([1000, 2000]);
  });

  it('getPingsForTrip only returns pings for the requested trip', async () => {
    const tripA = newTripId();
    const tripB = newTripId();
    await addPing(makePing(tripA, 1000));
    await addPing(makePing(tripB, 1000));
    const pingsA = await getPingsForTrip(tripA);
    expect(pingsA).toHaveLength(1);
    expect(pingsA[0].tripId).toBe(tripA);
  });

  it("deletePingsForTrip removes only that trip's pings", async () => {
    const tripA = newTripId();
    const tripB = newTripId();
    await addPing(makePing(tripA, 1000));
    await addPing(makePing(tripB, 1000));

    await deletePingsForTrip(tripA);

    expect(await getPingsForTrip(tripA)).toEqual([]);
    expect(await getPingsForTrip(tripB)).toHaveLength(1);
  });
});
