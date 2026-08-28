import { clear, createStore, del, entries, get, set, setMany, values } from 'idb-keyval';
import type { DaySummary, GpsPing } from '../types';

// Live GPS pings can number in the thousands over a multi-day tow trip, so each
// ping is its own IndexedDB entry (keyed by timestamp) rather than one big array
// under a single key — avoids a read-modify-write of the whole log on every tick.
//
// Separate databases (not two stores in one db): idb-keyval's createStore() issues
// its own indexedDB.open() per call, and a second open() against an already-created
// database doesn't fire onupgradeneeded — so a second same-db store never actually
// gets created. Two db names sidesteps that entirely.
const pingsStore = createStore('buringplan-gps-pings', 'pings');
const summariesStore = createStore('buringplan-gps-summaries', 'day-summaries');

export function newTripId(): string {
  return crypto.randomUUID();
}

export async function addPing(ping: GpsPing): Promise<void> {
  await set(`${ping.tripId}:${ping.timestamp}`, ping, pingsStore);
}

export async function getPingsForTrip(tripId: string): Promise<GpsPing[]> {
  const all = await entries<string, GpsPing>(pingsStore);
  return all
    .map(([, ping]) => ping)
    .filter((ping) => ping.tripId === tripId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function saveDaySummary(summary: DaySummary): Promise<void> {
  await set(summary.tripId, summary, summariesStore);
}

export async function getAllDaySummaries(): Promise<DaySummary[]> {
  const all = await values<DaySummary>(summariesStore);
  return all.sort((a, b) => a.startTime - b.startTime);
}

export async function updateDaySummary(
  tripId: string,
  patch: Partial<Omit<DaySummary, 'tripId'>>,
): Promise<void> {
  const existing = await get<DaySummary>(tripId, summariesStore);
  if (!existing) return;
  await set(tripId, { ...existing, ...patch }, summariesStore);
}

// Wipe every summary (and every raw ping) and write the given set in one shot.
// Used by the snapshot import — a restored trip replaces the log wholesale, and
// old pings would just be orphans pointing at trip ids that no longer exist.
export async function replaceAllDaySummaries(summaries: DaySummary[]): Promise<void> {
  await clear(pingsStore);
  await clear(summariesStore);
  if (summaries.length > 0) {
    await setMany(
      summaries.map((s) => [s.tripId, s] as [string, DaySummary]),
      summariesStore,
    );
  }
}

export async function deletePingsForTrip(tripId: string): Promise<void> {
  const all = await entries<string, GpsPing>(pingsStore);
  await Promise.all(
    all.filter(([, ping]) => ping.tripId === tripId).map(([key]) => del(key, pingsStore)),
  );
}

export async function deleteDaySummary(tripId: string): Promise<void> {
  await del(tripId, summariesStore);
  await deletePingsForTrip(tripId);
}
