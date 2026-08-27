import { createStore, del, entries, get, set, values } from 'idb-keyval';
import type { DaySummary, GpsPing } from '../types';

// Live GPS pings can number in the thousands over a multi-day tow trip, so each
// ping is its own IndexedDB entry (keyed by timestamp) rather than one big array
// under a single key — avoids a read-modify-write of the whole log on every tick.
const pingsStore = createStore('buringplan-gps', 'pings');
const summariesStore = createStore('buringplan-gps', 'day-summaries');

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

export async function exportTripLogJson(): Promise<string> {
  const summaries = await getAllDaySummaries();
  const allPings = await entries<string, GpsPing>(pingsStore);
  const pings = allPings.map(([, ping]) => ping).sort((a, b) => a.timestamp - b.timestamp);
  return JSON.stringify({ summaries, pings }, null, 2);
}

export async function exportTripLogGpx(): Promise<string> {
  const allPings = await entries<string, GpsPing>(pingsStore);
  const byTrip = new Map<string, GpsPing[]>();
  for (const [, ping] of allPings) {
    const list = byTrip.get(ping.tripId) ?? [];
    list.push(ping);
    byTrip.set(ping.tripId, list);
  }

  const segments = [...byTrip.entries()]
    .map(([, pings]) => {
      const sorted = pings.sort((a, b) => a.timestamp - b.timestamp);
      const points = sorted
        .map(
          (p) =>
            `<trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.timestamp).toISOString()}</time></trkpt>`,
        )
        .join('\n      ');
      return `    <trkseg>\n      ${points}\n    </trkseg>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="buringplan" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Burning Man Tow Trip</name>
${segments}
  </trk>
</gpx>`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
